import { type Ref, computed, ref } from 'vue';
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
    const currentVersion = ref(typeof options.recordVersion === 'number' ? options.recordVersion : options.recordVersion.value);
    const saveStatus = ref<SaveStatus>(null);
    const isDirty = ref(false);
    const isSaving = ref(false);
    const isConflict = ref(false);
    const conflictError = ref<RequestFeedbackError | null>(null);
    const feedbackError = ref<RequestFeedbackError | null>(null);
    const validationErrors = ref<Record<string, string[] | string> | null>(null);

    async function save(): Promise<void> {}
    async function retry(): Promise<void> {}
    function startAutosave(): void {}
    function stopAutosave(): void {}
    function resolveConflict(): void {}

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
