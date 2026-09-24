<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import { sendJson } from '@/lib/http';

import { EXPORT_STATUS_LABELS, failureMessage, isSettled, type ExportJob } from './exportJob';

type BulkItem = { record_id: number } & (ExportJob | { error: { code: string; message: string } });

/**
 * Export of an explicit selection (12 §71): one independently authorized request per record.
 * Once every file settled, the server packages the ready ones as one ZIP (G04).
 */
const props = withDefaults(defineProps<{ selected: { id: number; request_no: string }[]; pollMs?: number }>(), {
    pollMs: 2000,
});

const { can } = usePermissions();
const format = ref<'XLSX' | 'PDF'>('XLSX');
const confirming = ref(false);
const sending = ref(false);
const error = ref<string | null>(null);
const batchId = ref<number | null>(null);
const items = ref<BulkItem[]>([]);
const names = ref<Record<number, string>>({});
let active = true;
onUnmounted(() => (active = false));

const isJob = (item: BulkItem): item is { record_id: number } & ExportJob => !('error' in item);
const jobs = computed(() => items.value.filter(isJob));
const readyCount = computed(() => jobs.value.filter((job) => job.status === 'READY').length);
const packageUrl = computed(() =>
    batchId.value !== null && readyCount.value > 0 && jobs.value.every(isSettled)
        ? `/nscmf/export-batches/${batchId.value}/download`
        : null,
);

async function follow(): Promise<void> {
    while (active && batchId.value !== null && items.value.some((item) => isJob(item) && !isSettled(item))) {
        await new Promise((resolve) => setTimeout(resolve, props.pollMs));
        if (!active) return;
        const result = await sendJson<{ data: { exports: ExportJob[] } }>(
            'GET',
            `/nscmf/export-batches/${batchId.value}`,
        );
        if (!result.ok || !result.body) return;
        const latest = new Map(result.body.data.exports.map((job) => [job.record_id, job]));
        items.value = items.value.map((item) => {
            const job = latest.get(item.record_id);
            return job && isJob(item) ? { ...job, record_id: item.record_id } : item;
        });
    }
}

async function submit(): Promise<void> {
    if (sending.value || props.selected.length === 0) return;
    sending.value = true;
    error.value = null;
    names.value = Object.fromEntries(props.selected.map((record) => [record.id, record.request_no]));
    const result = await sendJson<{ data: { id: number; items: BulkItem[] } }>('POST', '/nscmf/exports/bulk', {
        format: format.value,
        record_ids: props.selected.map((record) => record.id),
    });
    sending.value = false;
    confirming.value = false;
    if (!result.ok || !result.body) {
        error.value = result.ok
            ? 'The bulk export could not be requested.'
            : result.error?.message || 'The bulk export could not be requested.';
        return;
    }
    batchId.value = result.body.data.id;
    items.value = result.body.data.items;
    void follow();
}
</script>

<template>
    <section
        v-if="can('nscmf.export.bulk')"
        data-testid="bulk-export"
        aria-label="Bulk export"
        class="space-y-3 rounded-lg border border-border bg-card p-4"
    >
        <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm font-medium">{{ selected.length }} selected</span>
            <label class="flex items-center gap-2 text-sm">
                Format
                <select
                    v-model="format"
                    data-testid="bulk-export-format"
                    class="rounded border border-input bg-background px-2 py-1 text-sm"
                >
                    <option value="XLSX">XLSX</option>
                    <option value="PDF">PDF</option>
                </select>
            </label>
            <Button
                size="sm"
                data-testid="bulk-export-start"
                :disabled="selected.length === 0 || sending"
                @click="selected.length > 0 && (confirming = true)"
                >Export selected</Button
            >
        </div>
        <div
            v-if="confirming"
            data-testid="bulk-export-confirm"
            class="space-y-2 rounded-md border border-border p-3 text-sm"
        >
            <p>
                Export {{ selected.length }} records as {{ format }}? Each record is checked on its own; ready files can
                be downloaded one by one or together as a ZIP.
            </p>
            <p class="break-words text-muted-foreground">
                {{ selected.map((record) => record.request_no).join(', ') }}
            </p>
            <div class="flex gap-2">
                <Button size="sm" data-testid="bulk-export-submit" :disabled="sending" @click="submit">Export</Button>
                <Button size="sm" variant="ghost" :disabled="sending" @click="confirming = false">Back</Button>
            </div>
        </div>
        <Alert v-if="error" variant="error" title="Bulk export not started">{{ error }}</Alert>
        <p v-if="packageUrl" class="flex flex-wrap items-center gap-2 text-sm">
            <a :href="packageUrl" data-testid="bulk-export-zip" class="font-medium text-primary hover:underline"
                >Download ZIP</a
            >
            <span class="text-muted-foreground"
                >{{ readyCount }} ready {{ readyCount === 1 ? 'file' : 'files' }}; failed or refused records are not
                included.</span
            >
        </p>
        <ul v-if="items.length" class="divide-y divide-border text-sm">
            <li
                v-for="item in items"
                :key="item.record_id"
                :data-testid="`bulk-item-${item.record_id}`"
                class="flex flex-wrap items-center justify-between gap-2 py-2"
            >
                <span class="font-medium">{{ names[item.record_id] ?? `#${item.record_id}` }}</span>
                <span v-if="!isJob(item)" class="text-destructive">{{ item.error.message }}</span>
                <span v-else class="flex items-center gap-2">
                    <Badge :variant="item.status === 'READY' ? 'success' : 'neutral'">{{
                        EXPORT_STATUS_LABELS[item.status]
                    }}</Badge>
                    <span v-if="item.status === 'FAILED'" class="text-xs text-destructive">{{
                        failureMessage(item)
                    }}</span>
                    <a
                        v-if="item.status === 'READY' && item.download_url"
                        :href="item.download_url"
                        class="text-primary hover:underline"
                        >Download</a
                    >
                </span>
            </li>
        </ul>
    </section>
</template>
