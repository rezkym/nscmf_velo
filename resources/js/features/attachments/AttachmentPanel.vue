<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { computed, onUnmounted, ref, watch } from 'vue';

import Button from '@/components/ui/Button.vue';

import AttachmentList, { type AttachmentItem } from './AttachmentList.vue';
import { fileProblem, type AttachmentPolicy } from './attachmentPolicy';
import { useChunkUpload, type UploadPhase } from './useChunkUpload';

/**
 * Optional attachments on an editable record (07 attachments; 11A; 12 §52–59): pick a file, upload
 * it in resumable chunks, and follow the malware scan. The parent decides whether this record is
 * editable and whether unsaved form changes must be saved first.
 */
const props = defineProps<{
    recordId: number;
    attachments: AttachmentItem[];
    policy: AttachmentPolicy | null;
    editable: boolean;
    lockedReason: string | null;
}>();
const emit = defineEmits<{ (e: 'changed'): void }>();

const PHASES: Record<UploadPhase, string> = {
    preparing: 'Preparing',
    uploading: 'Uploading',
    interrupted: 'Interrupted',
    conflict: 'Stopped',
    expired: 'Expired',
    scanning: 'Scanning',
    done: 'Processed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    'cancel-failed': 'Cancel not confirmed',
};
const RUNNING: UploadPhase[] = ['preparing', 'uploading', 'scanning'];

const uploads = ref<ReturnType<typeof useChunkUpload>[]>([]);
const problem = ref<string | null>(null);
const accept = computed(() => props.policy?.extensions.map((extension) => `.${extension}`).join(',') ?? '');
const pickerDisabled = computed(() => !props.policy || props.lockedReason !== null);
const running = computed(() => uploads.value.filter((upload) => RUNNING.includes(upload.state.phase)).length);

async function pick(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !props.policy || pickerDisabled.value) return;

    problem.value = fileProblem(file, props.policy, props.attachments.length + running.value);
    if (problem.value) return;

    const upload = useChunkUpload(props.recordId, file);
    uploads.value = [...uploads.value.filter((existing) => existing.state.filename !== file.name), upload];
    await upload.start();
    if (upload.state.phase === 'done') emit('changed');
}

// A file still being scanned elsewhere: follow it through the page's own props, never a new endpoint.
let timer: ReturnType<typeof setInterval> | null = null;
watch(
    () => props.attachments.some((attachment) => attachment.security_status === 'PENDING'),
    (pending) => {
        if (pending && !timer) timer = setInterval(() => router.reload({ only: ['attachments'] }), 3000);
        if (!pending && timer) {
            clearInterval(timer);
            timer = null;
        }
    },
    { immediate: true },
);
onUnmounted(() => {
    if (timer) clearInterval(timer);
    uploads.value.forEach((upload) => upload.stop());
});
</script>

<template>
    <section aria-label="Attachments" class="space-y-4 rounded-lg border border-border bg-card p-6">
        <div class="space-y-1">
            <h2 class="font-semibold">Attachments</h2>
            <p class="text-sm text-muted-foreground">
                Attachments are optional. A file can be downloaded only after the malware scan marks it Ready.
            </p>
        </div>

        <div v-if="editable" class="space-y-2">
            <label for="attachment-input" class="block text-sm font-medium">Add a file</label>
            <input
                id="attachment-input"
                type="file"
                data-testid="attachment-input"
                :accept="accept"
                :disabled="pickerDisabled"
                class="block w-full text-sm"
                @change="pick"
            />
            <p v-if="!policy" class="text-sm text-muted-foreground">Attachments are not available right now.</p>
            <p v-else-if="lockedReason" class="text-sm text-muted-foreground">{{ lockedReason }}</p>
            <p v-else class="text-xs text-muted-foreground">
                Up to {{ policy.max_files }} files, {{ policy.max_bytes.toLocaleString('en-US') }} bytes each:
                {{ policy.extensions.join(', ').toUpperCase() }}.
            </p>
            <p v-if="problem" role="alert" class="text-sm text-destructive">{{ problem }}</p>
        </div>

        <ul v-if="uploads.length" class="space-y-2">
            <li
                v-for="upload in uploads"
                :key="upload.state.filename"
                :data-testid="`upload-${upload.state.filename}`"
                class="space-y-1 rounded-md border border-border p-3 text-sm"
            >
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="break-all font-medium">{{ upload.state.filename }}</span>
                    <span class="text-muted-foreground">
                        {{ PHASES[upload.state.phase] }}
                        <template v-if="upload.state.total">
                            · {{ upload.state.accepted }}/{{ upload.state.total }} parts</template
                        >
                    </span>
                </div>
                <progress
                    v-if="upload.state.total"
                    class="w-full"
                    :value="upload.state.accepted"
                    :max="upload.state.total"
                    :aria-label="`${upload.state.filename} upload progress`"
                />
                <p v-if="upload.state.message" role="status" class="text-xs">{{ upload.state.message }}</p>
                <Button
                    v-if="['uploading', 'interrupted', 'cancel-failed'].includes(upload.state.phase)"
                    variant="ghost"
                    size="sm"
                    @click="upload.cancel()"
                    >Cancel upload</Button
                >
            </li>
        </ul>

        <AttachmentList
            :record-id="recordId"
            :attachments="attachments"
            :manageable="editable && lockedReason === null"
            @changed="emit('changed')"
        />
    </section>
</template>
