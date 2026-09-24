<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
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
    <section v-if="can('nscmf.export.bulk')" data-testid="bulk-export" aria-label="Bulk export">
        <Card size="sm">
            <CardContent class="grid gap-3">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="font-medium">{{ selected.length }} selected</span>
                    <Field orientation="horizontal" class="w-auto">
                        <FieldLabel for="bulk-export-format">Format</FieldLabel>
                        <NativeSelect id="bulk-export-format" v-model="format" data-testid="bulk-export-format">
                            <option value="XLSX">XLSX</option>
                            <option value="PDF">PDF</option>
                        </NativeSelect>
                    </Field>
                    <Button
                        type="button"
                        size="sm"
                        data-testid="bulk-export-start"
                        :disabled="selected.length === 0 || sending"
                        @click="selected.length > 0 && (confirming = true)"
                    >
                        Export selected
                    </Button>
                </div>

                <Alert v-if="confirming" data-testid="bulk-export-confirm">
                    <AlertDescription class="grid gap-2">
                        <p class="text-foreground">
                            Export {{ selected.length }} records as {{ format }}? Each record is checked on its own;
                            ready files can be downloaded one by one or together as a ZIP.
                        </p>
                        <p class="break-words">{{ selected.map((record) => record.request_no).join(', ') }}</p>
                        <div class="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                data-testid="bulk-export-submit"
                                :disabled="sending"
                                @click="submit"
                            >
                                Export
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                :disabled="sending"
                                @click="confirming = false"
                            >
                                Back
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>

                <Alert v-if="error" variant="destructive">
                    <AlertTitle>Bulk export not started</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <p v-if="packageUrl" class="flex flex-wrap items-center gap-2">
                    <a
                        :href="packageUrl"
                        data-testid="bulk-export-zip"
                        class="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Download ZIP
                    </a>
                    <span class="text-muted-foreground">
                        {{ readyCount }} ready {{ readyCount === 1 ? 'file' : 'files' }}; failed or refused records are
                        not included.
                    </span>
                </p>

                <ul v-if="items.length" class="grid gap-2">
                    <li v-for="item in items" :key="item.record_id" :data-testid="`bulk-item-${item.record_id}`">
                        <Item variant="outline" size="sm">
                            <ItemContent>
                                <ItemTitle>{{ names[item.record_id] ?? `#${item.record_id}` }}</ItemTitle>
                                <ItemDescription v-if="!isJob(item)" class="text-destructive">
                                    {{ item.error.message }}
                                </ItemDescription>
                                <ItemDescription v-else-if="item.status === 'FAILED'" class="text-destructive">
                                    {{ failureMessage(item) }}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions v-if="isJob(item)">
                                <Badge :variant="item.status === 'READY' ? 'success' : 'secondary'">
                                    {{ EXPORT_STATUS_LABELS[item.status] }}
                                </Badge>
                                <Button
                                    v-if="item.status === 'READY' && item.download_url"
                                    as-child
                                    variant="link"
                                    size="sm"
                                >
                                    <a :href="item.download_url">Download</a>
                                </Button>
                            </ItemActions>
                        </Item>
                    </li>
                </ul>
            </CardContent>
        </Card>
    </section>
</template>
