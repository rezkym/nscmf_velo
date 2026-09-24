import { type Ref, computed, getCurrentInstance, onBeforeUnmount, ref, toValue, watch } from 'vue';

import { isRecordConflictCode } from '@/lib/apiErrors';
import { sendJson } from '@/lib/http';
import type { RequestFeedbackError, SaveStatus } from '@/types/feedback';

import type { BusinessStatus } from './contracts';
import {
    buildActivationDraftPayload,
    buildChangeDraftPayload,
    type DraftHeader,
    normalizeHeader,
} from './draftPayload';
import type { ActivationDraftFields, ChangeDraftFields, NscmfFamily } from './types';

export type { RequestFeedbackError, SaveStatus };

export interface UseDraftSaveOptions<T extends ActivationDraftFields | ChangeDraftFields> {
    recordId: number | Ref<number>;
    family: NscmfFamily;
    recordVersion: number | Ref<number>;
    /** Where the record stands, so the Change payload can withhold `results` (12 §28.2). */
    businessStatus: BusinessStatus | Ref<BusinessStatus>;
    fields: Ref<T>;
    /** The optional header block (12 §26.1); only the keys the page may change. */
    header?: Ref<DraftHeader>;
    autosaveInterval?: number;
    enabled?: boolean | Ref<boolean>;
    onSuccess?: (newVersion: number) => void;
    onError?: (error: unknown) => void;
}

export interface UseDraftSaveReturn {
    currentVersion: Ref<number>;
    saveStatus: Ref<SaveStatus>;
    isDirty: Ref<boolean>;
    isSaving: Ref<boolean>;
    isConflict: Ref<boolean>;
    conflictError: Ref<RequestFeedbackError | null>;
    feedbackError: Ref<RequestFeedbackError | null>;
    validationErrors: Ref<Record<string, string[] | string> | null>;
    warnings: Ref<string[]>;
    save: () => Promise<void>;
    retry: () => Promise<void>;
    startAutosave: () => void;
    stopAutosave: () => void;
    resolveConflict: (newVersion?: number) => void;
    resync: (serverVersion: number) => void;
}

interface SaveResponseBody {
    data?: { record_version?: unknown };
    meta?: { warnings?: unknown };
}

/**
 * Draft/Revision save over the approved same-origin JSON endpoint PATCH /nscmf/{record}/draft
 * (12 §4.2, §26): one request at a time, later saves queue behind it, the acknowledged
 * record_version is adopted (never incremented locally), edits typed while a request is in flight
 * stay dirty, and a 409 pauses everything until the user refreshes — nothing is replayed.
 */
export function useDraftSave<T extends ActivationDraftFields | ChangeDraftFields>(
    options: UseDraftSaveOptions<T>,
): UseDraftSaveReturn {
    const recordId = computed(() => toValue(options.recordId));
    const currentVersion = ref(toValue(options.recordVersion));
    const saveStatus = ref<SaveStatus>(null);
    const isSaving = ref(false);
    const isConflict = ref(false);
    const conflictError = ref<RequestFeedbackError | null>(null);
    const feedbackError = ref<RequestFeedbackError | null>(null);
    const validationErrors = ref<Record<string, string[] | string> | null>(null);
    const warnings = ref<string[]>([]);

    function snapshot(): string {
        return JSON.stringify({ fields: options.fields.value, header: options.header?.value ?? null });
    }

    const lastSavedSnapshot = ref(snapshot());
    const isDirty = computed(() => snapshot() !== lastSavedSnapshot.value);

    let isRequestInFlight = false;
    let queued: { promise: Promise<void>; resolve: () => void } | null = null;
    let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    let isAutosaveRunning = Boolean(options.autosaveInterval);
    const isAutosaveOptionEnabled = computed(() =>
        options.enabled === undefined ? true : Boolean(toValue(options.enabled)),
    );

    // Always reconsidered: an edit that restores the saved value must cancel the armed timer.
    watch(snapshot, () => scheduleAutosave(), { flush: 'sync' });

    function canAutosave(): boolean {
        return Boolean(
            options.autosaveInterval && isAutosaveRunning && isAutosaveOptionEnabled.value && !isConflict.value,
        );
    }

    function clearTimer(): void {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
    }

    function scheduleAutosave(): void {
        clearTimer();
        if (!canAutosave() || !isDirty.value) return;

        autosaveTimer = setTimeout(() => {
            // Re-checked on firing: the answer can have changed while the timer was pending.
            if (canAutosave() && !isRequestInFlight) void executeSave();
        }, options.autosaveInterval);
    }

    function buildPayload(): Record<string, unknown> {
        const version = currentVersion.value;
        const body: Record<string, unknown> =
            options.family === 'ACTIVATION'
                ? { ...buildActivationDraftPayload(version, options.fields.value as ActivationDraftFields) }
                : {
                      ...buildChangeDraftPayload(
                          version,
                          options.fields.value as ChangeDraftFields,
                          toValue(options.businessStatus),
                      ),
                  };

        if (!options.header) return body;

        const familyKey = options.family === 'ACTIVATION' ? 'activation' : 'change';
        return { record_version: version, header: normalizeHeader(options.header.value), [familyKey]: body[familyKey] };
    }

    function conflictFeedback(
        code: string | undefined,
        message: string | undefined,
        context?: Record<string, unknown>,
    ): RequestFeedbackError {
        const fallback =
            code === 'NSCMF_VERSION_CONFLICT'
                ? 'A newer version of this record exists.'
                : 'This record changed. Refresh to see the latest version.';
        return { status: 409, code, message: message || fallback, context };
    }

    function fail(error: RequestFeedbackError): void {
        saveStatus.value = 'error';
        feedbackError.value = error;
        options.onError?.(error);
    }

    async function executeSave(): Promise<void> {
        if (isRequestInFlight) {
            queued ??= (() => {
                let resolve: () => void = () => {};
                const promise = new Promise<void>((done) => (resolve = done));
                return { promise, resolve };
            })();
            return queued.promise;
        }

        if (isConflict.value) return;
        clearTimer();

        const sentSnapshot = snapshot();
        const payload = buildPayload();

        isRequestInFlight = true;
        isSaving.value = true;
        saveStatus.value = 'saving';
        feedbackError.value = null;
        validationErrors.value = null;

        try {
            const result = await sendJson<SaveResponseBody>('PATCH', `/nscmf/${recordId.value}/draft`, payload);

            if (result.ok) {
                const acknowledged = result.body?.data?.record_version;
                if (typeof acknowledged === 'number') {
                    currentVersion.value = acknowledged;
                    options.onSuccess?.(acknowledged);
                }
                const serverWarnings = result.body?.meta?.warnings;
                warnings.value = Array.isArray(serverWarnings)
                    ? serverWarnings.filter((w): w is string => typeof w === 'string')
                    : [];
                lastSavedSnapshot.value = sentSnapshot;
                // An edit typed while the request was in flight is not saved yet.
                saveStatus.value = snapshot() === sentSnapshot ? 'saved' : null;
                return;
            }

            const { status, error } = result;
            if (status === 409 || isRecordConflictCode(error?.code)) {
                const conflict = conflictFeedback(error?.code, error?.message, error?.context);
                isConflict.value = true;
                conflictError.value = conflict;
                stopAutosave();
                fail(conflict);
                return;
            }

            if (status === 422) {
                validationErrors.value = error?.errors ?? {};
                fail({
                    status,
                    code: error?.code,
                    message: error?.message || 'Some fields need to be corrected.',
                    errors: error?.errors,
                    context: error?.context,
                });
                return;
            }

            if (status === 0) {
                fail({ status: 0, isNetworkError: true, message: 'Network connection lost' });
                return;
            }

            fail({
                status,
                code: error?.code,
                message: error?.message || 'Server error',
                errors: error?.errors,
                context: error?.context,
            });
        } finally {
            isRequestInFlight = false;
            isSaving.value = false;
            runQueued();
        }
    }

    function runQueued(): void {
        const next = queued;
        queued = null;
        if (!next) return;

        if (isConflict.value) {
            // A conflict cancels the queued save; whoever awaited it is still released (FE-28 gates Submit on it).
            next.resolve();
            return;
        }

        void executeSave().then(next.resolve, next.resolve);
    }

    function startAutosave(): void {
        isAutosaveRunning = true;
        scheduleAutosave();
    }

    function stopAutosave(): void {
        isAutosaveRunning = false;
        clearTimer();
    }

    function resolveConflict(newVersion?: number): void {
        const latest = conflictError.value?.context?.latest_record_version;
        const resyncVersion =
            typeof newVersion === 'number' ? newVersion : typeof latest === 'number' ? latest : undefined;
        isConflict.value = false;
        conflictError.value = null;
        feedbackError.value = null;
        if (typeof resyncVersion === 'number') currentVersion.value = resyncVersion;
    }

    /** After an explicit refresh: the page has reloaded server data into the fields. */
    function resync(serverVersion: number): void {
        isConflict.value = false;
        conflictError.value = null;
        feedbackError.value = null;
        validationErrors.value = null;
        saveStatus.value = null;
        currentVersion.value = serverVersion;
        lastSavedSnapshot.value = snapshot();
        if (options.autosaveInterval) isAutosaveRunning = true;
    }

    if (getCurrentInstance()) onBeforeUnmount(stopAutosave);

    return {
        currentVersion,
        saveStatus,
        isDirty,
        isSaving,
        isConflict,
        conflictError,
        feedbackError,
        validationErrors,
        warnings,
        save: executeSave,
        retry: executeSave,
        startAutosave,
        stopAutosave,
        resolveConflict,
        resync,
    };
}
