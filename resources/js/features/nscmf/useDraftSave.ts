import { router } from '@inertiajs/vue3';
import { type Ref, computed, getCurrentInstance, onBeforeUnmount, ref, toValue, watch } from 'vue';
import { buildActivationDraftPayload, buildChangeDraftPayload } from './draftPayload';
import type { ActivationDraftFields, ChangeDraftFields, NscmfFamily } from './types';

export type SaveStatus = 'saving' | 'saved' | 'error' | null;

export interface RequestFeedbackError {
    status?: number;
    code?: string;
    message?: string;
    errors?: Record<string, string[] | string>;
    context?: Record<string, unknown>;
    isNetworkError?: boolean;
}

export interface UseDraftSaveOptions<T extends ActivationDraftFields | ChangeDraftFields> {
    recordId: number | Ref<number>;
    family: NscmfFamily;
    recordVersion: number | Ref<number>;
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
    resolveConflict: () => void;
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
    let inFlightSnapshot: string | null = null;
    let pendingSavePromise: Promise<void> | null = null;
    let nextQueuedSaveResolve: (() => void) | null = null;
    let hasQueuedSave = false;
    let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    let isAutosaveRunning = Boolean(options.autosaveInterval && options.autosaveInterval > 0);

    // Computed dirty state so it updates synchronously on mutation
    const isDirty = computed(() => {
        return JSON.stringify(options.fields.value) !== lastSavedSnapshot.value;
    });

    // Watch fields for dirty detection and autosave scheduling
    watch(
        () => JSON.stringify(options.fields.value),
        () => {
            if (isDirty.value && isAutosaveRunning && !isConflict.value) {
                scheduleAutosave();
            }
        },
        { flush: 'sync' },
    );

    function scheduleAutosave(): void {
        if (!options.autosaveInterval || isConflict.value || !isAutosaveRunning) return;
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            if (!isSaving.value && !isConflict.value && isAutosaveRunning) {
                void executeSave();
            }
        }, options.autosaveInterval);
    }

    function buildPayload(version: number, fieldsData: T) {
        if (options.family === 'ACTIVATION') {
            return buildActivationDraftPayload(version, fieldsData as ActivationDraftFields);
        }
        return buildChangeDraftPayload(version, fieldsData as ChangeDraftFields);
    }

    async function executeSave(): Promise<void> {
        if (isSaving.value) {
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

        isSaving.value = true;
        saveStatus.value = 'saving';
        feedbackError.value = null;
        validationErrors.value = null;

        const snapshotToSave = JSON.stringify(options.fields.value);
        inFlightSnapshot = snapshotToSave;

        const payload = buildPayload(currentVersion.value, options.fields.value);
        const url = `/nscmf/${recordId.value}/draft`;

        return new Promise<void>((resolve) => {
            router.patch(url, payload as never, {
                onSuccess: (page: unknown) => {
                    isSaving.value = false;
                    const responseRecord = (page as { props?: { record?: { record_version?: number } } })?.props?.record;
                    if (responseRecord && typeof responseRecord.record_version === 'number') {
                        currentVersion.value = responseRecord.record_version;
                        options.onSuccess?.(responseRecord.record_version);
                    }

                    lastSavedSnapshot.value = inFlightSnapshot!;
                    inFlightSnapshot = null;

                    // If user modified fields while in-flight, keep dirty and don't falsely claim saved
                    const currentStr = JSON.stringify(options.fields.value);
                    if (currentStr !== lastSavedSnapshot.value) {
                        saveStatus.value = null;
                    } else {
                        saveStatus.value = 'saved';
                    }

                    resolve();
                    handleNextQueued();
                },
                onError: (err: unknown) => {
                    isSaving.value = false;
                    inFlightSnapshot = null;
                    saveStatus.value = 'error';

                    const rawError = (err ?? {}) as RequestFeedbackError;
                    feedbackError.value = rawError;

                    if (rawError.status === 409 || rawError.code === 'NSCMF_VERSION_CONFLICT') {
                        isConflict.value = true;
                        conflictError.value = rawError;
                        stopAutosave();
                    } else if (rawError.status === 422 || rawError.code === 'NSCMF_VALIDATION_FAILED') {
                        validationErrors.value = rawError.errors ?? null;
                    }

                    options.onError?.(rawError);
                    resolve();
                    handleNextQueued();
                },
            });
        });
    }

    function handleNextQueued(): void {
        if (hasQueuedSave && !isConflict.value) {
            hasQueuedSave = false;
            const resolver = nextQueuedSaveResolve;
            nextQueuedSaveResolve = null;
            pendingSavePromise = null;
            void executeSave().then(() => {
                resolver?.();
            });
        } else {
            hasQueuedSave = false;
            nextQueuedSaveResolve = null;
            pendingSavePromise = null;
        }
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

    function resolveConflict(): void {
        isConflict.value = false;
        conflictError.value = null;
        feedbackError.value = null;
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
