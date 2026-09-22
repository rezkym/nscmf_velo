import { router, usePage } from '@inertiajs/vue3';
import { type Ref, computed, getCurrentInstance, onBeforeUnmount, ref, toValue, watch } from 'vue';
import { isRecordConflictCode, pageDomainError } from '@/lib/apiErrors';
import { type BusinessStatus, parseApiErrorEnvelope } from './contracts';
import { buildActivationDraftPayload, buildChangeDraftPayload } from './draftPayload';
import type { ActivationDraftFields, ChangeDraftFields, NscmfFamily } from './types';

import type { RequestFeedbackError, SaveStatus } from '@/types/feedback';
export type { RequestFeedbackError, SaveStatus };

export interface UseDraftSaveOptions<T extends ActivationDraftFields | ChangeDraftFields> {
    recordId: number | Ref<number>;
    family: NscmfFamily;
    recordVersion: number | Ref<number>;
    /** Where the record stands, so the Change payload can withhold `results` (12 §28.2). */
    businessStatus: BusinessStatus | Ref<BusinessStatus>;
    fields: Ref<T>;
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
    save: () => Promise<void>;
    retry: () => Promise<void>;
    startAutosave: () => void;
    stopAutosave: () => void;
    resolveConflict: (newVersion?: number) => void;
}

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

    // Snapshot tracking for dirty state & concurrency
    const lastSavedSnapshot = ref(JSON.stringify(toValue(options.fields)));
    let inFlightCount = 0;
    let pendingSavePromise: Promise<void> | null = null;
    let nextQueuedSaveResolve: (() => void) | null = null;
    let hasQueuedSave = false;
    let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    const isAutosaveOptionEnabled = computed(() => {
        if (options.enabled === undefined) return true;
        return Boolean(toValue(options.enabled));
    });
    let isAutosaveRunning = Boolean(options.autosaveInterval);

    // Computed dirty state so it updates synchronously on mutation
    const isDirty = computed(() => {
        return JSON.stringify(options.fields.value) !== lastSavedSnapshot.value;
    });

    // Watch fields for dirty detection and autosave scheduling
    watch(
        () => JSON.stringify(options.fields.value),
        () => {
            if (isDirty.value && !isConflict.value) {
                scheduleAutosave();
            }
        },
        { flush: 'sync' },
    );

    /** Autosave is allowed only while configured, running, enabled, and not blocked by a conflict. */
    function canAutosave(): boolean {
        return Boolean(
            options.autosaveInterval && isAutosaveRunning && isAutosaveOptionEnabled.value && !isConflict.value,
        );
    }

    function scheduleAutosave(): void {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
        if (!canAutosave()) return;

        autosaveTimer = setTimeout(() => {
            // Re-checked on firing: the answer can have changed while the timer was pending.
            if (canAutosave() && inFlightCount === 0) {
                void executeSave();
            }
        }, options.autosaveInterval);
    }

    function buildPayload(version: number, fieldsData: T) {
        if (options.family === 'ACTIVATION') {
            return buildActivationDraftPayload(version, fieldsData as ActivationDraftFields);
        }
        return buildChangeDraftPayload(version, fieldsData as ChangeDraftFields, toValue(options.businessStatus));
    }

    /**
     * Describes a record conflict without overstating it: only NSCMF_VERSION_CONFLICT means a newer
     * version exists (12 §21). A state or archived conflict gets the server's own message, or a
     * neutral one, because the remedy is the same refresh but the cause is not.
     */
    function conflictFeedback(
        status: number,
        code: string | undefined,
        message: string | undefined,
        context?: Record<string, unknown>,
    ): RequestFeedbackError {
        const fallback =
            code === 'NSCMF_VERSION_CONFLICT'
                ? 'A newer version of this record exists.'
                : 'This record changed. Refresh to see the latest version.';
        return { status, code, message: message || fallback, context };
    }

    function applyConflict(conflictObj: RequestFeedbackError): void {
        isConflict.value = true;
        conflictError.value = conflictObj;
        feedbackError.value = conflictObj;
        saveStatus.value = 'error';
        stopAutosave();
        options.onError?.(conflictObj);
    }

    function checkPageFlashForConflict(pageOrFlash?: unknown): boolean {
        let dErr = pageDomainError(pageOrFlash);
        if (!dErr) {
            try {
                dErr = pageDomainError(usePage());
            } catch {
                // Not in an Inertia component context.
            }
        }
        if (dErr && isRecordConflictCode(dErr.code)) {
            applyConflict(conflictFeedback(409, dErr.code, dErr.message));
            return true;
        }
        return false;
    }

    async function executeSave(): Promise<void> {
        if (inFlightCount > 0) {
            hasQueuedSave = true;
            if (!pendingSavePromise) {
                pendingSavePromise = new Promise<void>((resolve) => {
                    nextQueuedSaveResolve = resolve;
                });
            }
            return pendingSavePromise;
        }

        if (isConflict.value) {
            return;
        }

        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }

        inFlightCount++;
        isSaving.value = true;
        saveStatus.value = 'saving';
        feedbackError.value = null;
        validationErrors.value = null;

        try {
            const snapshotToSave = JSON.stringify(options.fields.value);

            const payload = buildPayload(currentVersion.value, options.fields.value);
            const url = `/nscmf/${recordId.value}/draft`;

            return new Promise<void>((resolve) => {
                let settled = false;
                const finishThisRequest = () => {
                    if (settled) return;
                    settled = true;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    isSaving.value = false;
                    resolve();
                    handleNextQueued();
                };

                router.patch(url, payload as never, {
                    onFlash: (flash: unknown) => {
                        checkPageFlashForConflict(flash);
                    },
                    onSuccess: (page: unknown) => {
                        if (settled) return;

                        if (isConflict.value || checkPageFlashForConflict(page)) {
                            finishThisRequest();
                            return;
                        }

                        const pageObj = page as { props?: { record?: { record_version?: number } } };
                        const responseRecord = pageObj?.props?.record;
                        if (responseRecord && typeof responseRecord.record_version === 'number') {
                            currentVersion.value = responseRecord.record_version;
                            options.onSuccess?.(responseRecord.record_version);
                        }

                        lastSavedSnapshot.value = snapshotToSave;

                        // If user modified fields while in-flight, keep dirty and don't falsely claim saved
                        const currentStr = JSON.stringify(options.fields.value);
                        if (currentStr !== lastSavedSnapshot.value) {
                            saveStatus.value = null;
                        } else {
                            saveStatus.value = 'saved';
                        }

                        finishThisRequest();
                    },
                    onError: (err: unknown) => {
                        saveStatus.value = 'error';

                        // The Inertia error bag carries no code; 422 alone identifies validation
                        // (12 §10, RequestFeedback classifies on status). G07: do not invent a name.
                        const fieldBag = (err ?? {}) as Record<string, string>;
                        validationErrors.value = fieldBag;
                        feedbackError.value = {
                            status: 422,
                            errors: fieldBag,
                        };

                        options.onError?.(feedbackError.value);
                        finishThisRequest();
                    },
                    onHttpException: (response: unknown) => {
                        saveStatus.value = 'error';

                        const res = response as { status?: number; statusText?: string; data?: unknown };
                        const status = typeof res?.status === 'number' ? res.status : 500;

                        let envelopeData: {
                            code?: string;
                            message?: string;
                            errors?: Record<string, string[] | string>;
                            context?: Record<string, unknown>;
                        } | null = null;

                        if (res?.data) {
                            try {
                                envelopeData = parseApiErrorEnvelope(res.data);
                            } catch {
                                // res.data is not a valid 12 §9 envelope
                            }
                        }

                        // res.data may also be an Inertia page carrying flash.domain_error.
                        const flashedDomainErr = pageDomainError(res?.data);

                        // parseApiErrorEnvelope reports UNKNOWN_ERROR when the body carries no code.
                        const rawCode = envelopeData?.code;
                        const envelopeCode = rawCode && rawCode !== 'UNKNOWN_ERROR' ? rawCode : undefined;
                        const conflictCode = [envelopeCode, flashedDomainErr?.code].find(isRecordConflictCode);

                        if (status === 409 || conflictCode) {
                            applyConflict(
                                conflictFeedback(
                                    409,
                                    conflictCode ?? envelopeCode ?? flashedDomainErr?.code,
                                    envelopeData?.message || flashedDomainErr?.message,
                                    envelopeData?.context,
                                ),
                            );
                            finishThisRequest();
                            return;
                        }

                        if (status === 422) {
                            const errObj: RequestFeedbackError = {
                                status: 422,
                                code: envelopeCode,
                                message: envelopeData?.message || 'Validation failed',
                                errors: envelopeData?.errors,
                                context: envelopeData?.context,
                            };
                            feedbackError.value = errObj;
                            if (envelopeData?.errors) {
                                validationErrors.value = envelopeData.errors;
                            }
                            options.onError?.(errObj);
                            finishThisRequest();
                            return;
                        }

                        const errObj: RequestFeedbackError = {
                            status,
                            code: envelopeData?.code,
                            message: envelopeData?.message || res?.statusText || 'Server error',
                            errors: envelopeData?.errors,
                            context: envelopeData?.context,
                        };

                        feedbackError.value = errObj;
                        options.onError?.(errObj);
                        finishThisRequest();
                    },
                    onNetworkError: (error: unknown) => {
                        saveStatus.value = 'error';

                        const errObj: RequestFeedbackError = {
                            status: 0,
                            isNetworkError: true,
                            message: error instanceof Error ? error.message : 'Network connection lost',
                        };

                        feedbackError.value = errObj;
                        options.onError?.(errObj);
                        finishThisRequest();
                    },
                    onFinish: () => {
                        if (inFlightCount === 0) {
                            isSaving.value = false;
                        }
                    },
                });
            });
        } catch (err) {
            inFlightCount = Math.max(0, inFlightCount - 1);
            isSaving.value = false;
            saveStatus.value = 'error';
            handleNextQueued();
            throw err;
        }
    }

    function handleNextQueued(): void {
        const wasQueued = hasQueuedSave;
        const resolver = nextQueuedSaveResolve;
        hasQueuedSave = false;
        nextQueuedSaveResolve = null;
        pendingSavePromise = null;

        if (wasQueued && !isConflict.value) {
            void executeSave().then(() => {
                resolver?.();
            });
            return;
        }

        // A conflict cancels the queued save, but whoever awaited it still has to be released:
        // FE-28 AC1 gates Submit on this promise.
        resolver?.();
    }

    async function save(): Promise<void> {
        return executeSave();
    }

    async function retry(): Promise<void> {
        return executeSave();
    }

    function startAutosave(): void {
        isAutosaveRunning = true;
        if (isDirty.value && !isConflict.value) {
            scheduleAutosave();
        }
    }

    function stopAutosave(): void {
        isAutosaveRunning = false;
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
    }

    function resolveConflict(newVersion?: number): void {
        const resyncVersion =
            typeof newVersion === 'number'
                ? newVersion
                : typeof conflictError.value?.context?.latest_record_version === 'number'
                  ? conflictError.value.context.latest_record_version
                  : undefined;
        isConflict.value = false;
        conflictError.value = null;
        feedbackError.value = null;
        if (typeof resyncVersion === 'number') {
            currentVersion.value = resyncVersion;
        }
    }

    if (getCurrentInstance()) {
        onBeforeUnmount(() => {
            stopAutosave();
        });
    }

    return {
        currentVersion,
        saveStatus,
        isDirty,
        isSaving,
        isConflict,
        conflictError,
        feedbackError,
        validationErrors,
        save,
        retry,
        startAutosave,
        stopAutosave,
        resolveConflict,
    };
}
