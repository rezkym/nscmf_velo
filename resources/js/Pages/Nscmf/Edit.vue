<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import RequestFeedback from '@/components/RequestFeedback.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { buttonVariants } from '@/components/ui/button';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import { usePermissions } from '@/composables/usePermissions';
import type { AttachmentItem } from '@/features/attachments/AttachmentList.vue';
import AttachmentPanel from '@/features/attachments/AttachmentPanel.vue';
import type { AttachmentPolicy } from '@/features/attachments/attachmentPolicy';
import BandwidthSection from '@/features/nscmf/activation/BandwidthSection.vue';
import GeneralServiceSection from '@/features/nscmf/activation/GeneralServiceSection.vue';
import NetworkHostingSection from '@/features/nscmf/activation/NetworkHostingSection.vue';
import SiteSection from '@/features/nscmf/activation/SiteSection.vue';
import PlanSection from '@/features/nscmf/change/PlanSection.vue';
import PurposeImpactSection from '@/features/nscmf/change/PurposeImpactSection.vue';
import ResultsSection from '@/features/nscmf/change/ResultsSection.vue';
import type { DraftHeader } from '@/features/nscmf/draftPayload';
import type { FieldErrors } from '@/features/nscmf/fieldErrors';
import { latestReturnReason } from '@/features/nscmf/returnReason';
import SubmitPanel, { type SaveState } from '@/features/nscmf/SubmitPanel.vue';
import {
    type ActivationDraftFields,
    type ActivationSubtype,
    type ChangeDraftFields,
    type ChangeSubtype,
    FAMILY_LABELS,
    type NscmfDetailRecord,
    STATUS_LABELS,
    SUBTYPE_LABELS,
} from '@/features/nscmf/types';
import { useDraftSave } from '@/features/nscmf/useDraftSave';
import AppLayout from '@/layouts/AppLayout.vue';
import { pageDomainError } from '@/lib/apiErrors';

/**
 * The Draft/Revision editor (FE-27 composition, BE-062). It binds one draft object to the section
 * components, saves through the JSON Draft endpoint (12 §26) and hands submission to SubmitPanel,
 * which posts the Inertia submit action (12 §30).
 */
const props = withDefaults(
    defineProps<{
        record: NscmfDetailRecord;
        warnings?: string[];
        attachments?: AttachmentItem[];
        attachment_policy?: AttachmentPolicy | null;
    }>(),
    { warnings: () => [], attachments: () => [], attachment_policy: null },
);

const AUTOSAVE_DEBOUNCE_MS = 2000;

const page = usePage();
const isActivation = computed(() => props.record.family === 'ACTIVATION');
const canCorrectNumber = computed(
    () => props.record.numbering_mode === 'MANUAL' && props.record.business_status === 'DRAFT',
);

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value ?? {})) as T;
}

function headerOf(record: NscmfDetailRecord): DraftHeader {
    return record.numbering_mode === 'MANUAL' && record.business_status === 'DRAFT'
        ? { request_date: record.request_date ?? null, request_no: record.request_no }
        : { request_date: record.request_date ?? null };
}

const activationFields = ref<ActivationDraftFields>(clone(props.record.activation ?? {}));
const changeFields = ref<ChangeDraftFields>(clone(props.record.change ?? {}));
const header = ref<DraftHeader>(headerOf(props.record));

const draft = isActivation.value
    ? useDraftSave<ActivationDraftFields>({
          recordId: props.record.id,
          family: 'ACTIVATION',
          recordVersion: props.record.record_version,
          businessStatus: computed(() => props.record.business_status),
          fields: activationFields,
          header,
          autosaveInterval: AUTOSAVE_DEBOUNCE_MS,
      })
    : useDraftSave<ChangeDraftFields>({
          recordId: props.record.id,
          family: 'CHANGE',
          recordVersion: props.record.record_version,
          businessStatus: computed(() => props.record.business_status),
          fields: changeFields,
          header,
          autosaveInterval: AUTOSAVE_DEBOUNCE_MS,
      });

// A reload (the explicit refresh after a conflict, or the redirect back after a submit error) brings
// the server's record: adopt it as the saved state.
watch(
    () => props.record,
    (record) => {
        activationFields.value = clone(record.activation ?? {});
        changeFields.value = clone(record.change ?? {});
        header.value = headerOf(record);
        draft.resync(record.record_version);
    },
);

/** Field errors keyed by wire path: the save's 422 bag and the submit's Inertia error bag. */
const fieldErrors = computed<FieldErrors>(() => {
    const merged: FieldErrors = {};
    const pageErrors = (page.props.errors ?? {}) as Record<string, string | string[]>;
    for (const source of [pageErrors, draft.validationErrors.value ?? {}]) {
        for (const [path, message] of Object.entries(source)) {
            merged[path] = Array.isArray(message) ? message[0] : message;
        }
    }
    return merged;
});

const submitErrors = computed(() => (page.props.errors ?? {}) as Record<string, string | string[]>);

const saveState = computed<SaveState>(() => {
    if (draft.isConflict.value) return 'conflict';
    if (draft.isSaving.value) return 'saving';
    if (draft.saveStatus.value === 'error') return 'error';
    if (draft.isDirty.value) return 'dirty';
    return draft.saveStatus.value === 'saved' ? 'saved' : 'clean';
});

const warnings = computed(() => (draft.saveStatus.value === 'saved' ? draft.warnings.value : props.warnings));

// Attachments belong to the owner's editable record (12 §52, §58). Adding or removing one moves the
// record version, so unsaved form changes are saved first and the record is reloaded afterwards.
const { can, user } = usePermissions();
const attachmentsEditable = computed(
    () =>
        can('nscmf.attachment.manage') &&
        props.record.owner?.id === user.value?.id &&
        ['DRAFT', 'REVISION_REQUIRED'].includes(props.record.business_status) &&
        !props.record.is_archived,
);
// Revision Edit shows why the record came back (FE-28). The reason is read from the Timeline,
// so an actor without the timeline permission still gets the Revision notice, without a reason.
const revisionReason = ref<string | null>(null);
const reasonRequest = new AbortController();
onMounted(async () => {
    if (props.record.business_status !== 'REVISION_REQUIRED' || !can('nscmf.timeline.view')) return;
    try {
        revisionReason.value = await latestReturnReason(props.record.id, reasonRequest.signal);
    } catch {
        revisionReason.value = null;
    }
});
onUnmounted(() => reasonRequest.abort());

const attachmentsLocked = computed(() =>
    saveState.value === 'clean' || saveState.value === 'saved'
        ? null
        : 'Save your changes before adding or removing attachments.',
);

function attachmentsChanged(): void {
    if (attachmentsLocked.value === null) router.reload();
    else router.reload({ only: ['attachments'] });
}
const domainError = computed(() => pageDomainError(page));

function saveNow(): void {
    void draft.save();
}

/** Explicit, user-driven refresh: reload the server record; never replay the refused save (12 §21). */
function refresh(): void {
    router.reload();
}

function signIn(): void {
    router.visit('/login');
}
</script>

<template>
    <AppLayout title="Edit NSCMF">
        <div class="mx-auto max-w-5xl space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-1">
                    <h1 class="text-xl font-semibold text-foreground">
                        {{ FAMILY_LABELS[record.family] }} — {{ SUBTYPE_LABELS[record.subtype] }}
                    </h1>
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                        <span class="font-mono">{{ record.request_no }}</span>
                        <Badge variant="neutral">{{ STATUS_LABELS[record.business_status] }}</Badge>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Link :href="`/nscmf/${record.id}`" :class="buttonVariants({ variant: 'secondary' })"
                        >View record</Link
                    >
                    <Button data-testid="btn-save-draft" :disabled="draft.isSaving.value" @click="saveNow">
                        {{ draft.isSaving.value ? 'Saving…' : 'Save draft' }}
                    </Button>
                </div>
            </div>

            <RequestFeedback
                :error="draft.feedbackError.value"
                :save-status="draft.saveStatus.value"
                @refresh="refresh"
                @retry="saveNow"
                @login="signIn"
            />

            <section data-testid="draft-header" class="space-y-4 rounded-lg border border-border bg-card p-6">
                <h2 class="text-base font-semibold">Request</h2>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField id="request_no" label="Request number" :error="fieldErrors['header.request_no']">
                        <template #default="{ id, describedBy }">
                            <input
                                v-if="canCorrectNumber"
                                :id="id"
                                v-model="header.request_no"
                                data-testid="draft-request-no"
                                type="text"
                                maxlength="64"
                                autocomplete="off"
                                :aria-describedby="describedBy"
                                :class="[controlClass, 'font-mono']"
                            />
                            <p v-else :id="id" class="font-mono text-sm text-foreground">{{ record.request_no }}</p>
                        </template>
                    </FormField>
                    <FormField
                        id="request_date"
                        label="Request date"
                        required
                        :error="fieldErrors['header.request_date']"
                    >
                        <template #default="{ id, describedBy }">
                            <input
                                :id="id"
                                v-model="header.request_date"
                                data-testid="draft-request-date"
                                type="date"
                                :aria-describedby="describedBy"
                                :class="controlClass"
                            />
                        </template>
                    </FormField>
                </div>
            </section>

            <template v-if="isActivation">
                <GeneralServiceSection
                    v-model="activationFields"
                    :subtype="record.subtype as ActivationSubtype"
                    :errors="fieldErrors"
                />
                <BandwidthSection v-model="activationFields" :errors="fieldErrors" />
                <NetworkHostingSection v-model="activationFields" :errors="fieldErrors" />
                <SiteSection v-model="activationFields" :errors="fieldErrors" />
            </template>
            <template v-else>
                <PurposeImpactSection
                    v-model="changeFields"
                    :subtype="record.subtype as ChangeSubtype"
                    :errors="fieldErrors"
                />
                <PlanSection v-model="changeFields" :subtype="record.subtype as ChangeSubtype" :errors="fieldErrors" />
                <ResultsSection
                    v-model="changeFields"
                    :subtype="record.subtype as ChangeSubtype"
                    :errors="fieldErrors"
                />
            </template>

            <AttachmentPanel
                :record-id="record.id"
                :attachments="attachments"
                :policy="attachment_policy"
                :editable="attachmentsEditable"
                :locked-reason="attachmentsLocked"
                @changed="attachmentsChanged"
            />

            <section class="rounded-lg border border-border bg-card p-6">
                <SubmitPanel
                    :record-id="record.id"
                    :record-version="draft.currentVersion.value"
                    :business-status="record.business_status"
                    :owner-id="record.owner?.id ?? null"
                    :allowed-actions="record.allowed_actions ?? []"
                    :save-state="saveState"
                    :errors="submitErrors"
                    :warnings="warnings"
                    :request-no="record.request_no"
                    :iteration="record.iteration_no ?? null"
                    :revision-reason="revisionReason"
                    :domain-error="domainError"
                />
            </section>
        </div>
    </AppLayout>
</template>
