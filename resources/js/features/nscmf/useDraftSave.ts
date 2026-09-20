import { router, usePage } from '@inertiajs/vue3';
import { type Ref, computed, getCurrentInstance, onBeforeUnmount, ref, toValue, watch } from 'vue';
import { domainError } from '@/lib/apiErrors';
import { parseApiErrorEnvelope } from './contracts';
import { buildActivationDraftPayload, buildChangeDraftPayload } from './draftPayload';
import type { ActivationDraftFields, ChangeDraftFields, NscmfFamily } from './types';

import type { RequestFeedbackError, SaveStatus } from '@/types/feedback';
export type { RequestFeedbackError, SaveStatus };

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
    let inFlightSnapshot: string | null = null;
    let inFlightCount = 0;
    let pendingSavePromise: Promise<void> | null = null;
    let nextQueuedSaveResolve: (() => void) | null = null;
    let hasQueuedSave = false;
    let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    const isAutosaveOptionEnabled = computed(() => {
        if (options.enabled === undefined) return true;
        return Boolean(toValue(options.enabled));
    });
    let isAutosaveRunning = Boolean(options.autosaveInterval && options.autosaveInterval > 0);

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

    function scheduleAutosave(): void {
        if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
        if (!options.autosaveInterval || isConflict.value || !isAutosaveRunning || !isAutosaveOptionEnabled.value) {
            return;
        }
        autosaveTimer = setTimeout(() => {
            if (inFlightCount === 0 && !isConflict.value && isAutosaveRunning && isAutosaveOptionEnabled.value) {
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

    function applyConflict(conflictObj: RequestFeedbackError): void {
        isConflict.value = true;
        conflictError.value = conflictObj;
        feedbackError.value = conflictObj;
        saveStatus.value = 'error';
        stopAutosave();
        options.onError?.(conflictObj);
    }

    function checkPageFlashForConflict(pageOrFlash?: unknown): boolean {
        let flashBag: unknown = undefined;
        if (pageOrFlash && typeof pageOrFlash === 'object') {
            const obj = pageOrFlash as Record<string, unknown>;
            if (obj.flash !== undefined) {
                flashBag = obj.flash;
            } else if (
                obj.props &&
                typeof obj.props === 'object' &&
                (obj.props as Record<string, unknown>).flash !== undefined
            ) {
                flashBag = (obj.props as Record<string, unknown>).flash;
            } else {
                flashBag = pageOrFlash;
            }
        }
        if (!flashBag) {
            try {
                const page = usePage();
                flashBag = (page as { flash?: unknown })?.flash ?? page?.props?.flash;
            } catch {
                // Not in inertia component context
            }
        }
        const dErr = domainError(flashBag);
        if (dErr && (dErr.code === 'NSCMF_VERSION_CONFLICT' || dErr.code?.includes('CONFLICT'))) {
            const conflictObj: RequestFeedbackError = {
                status: 409,
                code: dErr.code,
                message: dErr.message ?? 'A newer version exists.',
            };
            applyConflict(conflictObj);
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
            inFlightSnapshot = snapshotToSave;

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

                        lastSavedSnapshot.value = inFlightSnapshot!;
                        inFlightSnapshot = null;

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
                        inFlightSnapshot = null;
                        saveStatus.value = 'error';

                        const fieldBag = (err ?? {}) as Record<string, string>;
                        validationErrors.value = fieldBag;
                        feedbackError.value = {
                            status: 422,
                            code: 'NSCMF_VALIDATION_FAILED',
                            errors: fieldBag,
                        };

                        options.onError?.(feedbackError.value);
                        finishThisRequest();
                    },
                    onHttpException: (response: unknown) => {
                        inFlightSnapshot = null;
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

                        // Also check if res.data is an Inertia page object containing flash.domain_error
                        let flashedDomainErr: { code?: string; message?: string } | null = null;
                        if (res?.data && typeof res.data === 'object') {
                            const dataObj = res.data as Record<string, unknown>;
                            const rawFlash =
                                dataObj.flash ?? (dataObj.props as Record<string, unknown> | undefined)?.flash;
                            flashedDomainErr = domainError(rawFlash);
                        }

                        const isConflict =
                            status === 409 ||
                            envelopeData?.code === 'NSCMF_VERSION_CONFLICT' ||
                            envelopeData?.code?.includes('CONFLICT') ||
                            flashedDomainErr?.code === 'NSCMF_VERSION_CONFLICT' ||
                            flashedDomainErr?.code?.includes('CONFLICT');

                        if (isConflict) {
                            const conflictObj: RequestFeedbackError = {
                                status: 409,
                                code:
                                    (envelopeData?.code !== 'UNKNOWN_ERROR' ? envelopeData?.code : undefined) ??
                                    flashedDomainErr?.code ??
                                    'NSCMF_VERSION_CONFLICT',
                                message:
                                    (envelopeData?.message ? envelopeData.message : undefined) ??
                                    flashedDomainErr?.message ??
                                    'A newer version of this record exists.',
                                context: envelopeData?.context,
                            };
                            applyConflict(conflictObj);
                            finishThisRequest();
                            return;
                        }

                        if (status === 422) {
                            const errObj: RequestFeedbackError = {
                                status: 422,
                                code: envelopeData?.code || 'NSCMF_VALIDATION_FAILED',
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
                        inFlightSnapshot = null;
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
            inFlightSnapshot = null;
            handleNextQueued();
            throw err;
        }
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
