<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { onUnmounted, ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from '@/features/nscmf/contracts';
import { formatJakarta } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

import { EXPORT_STATUS_LABELS, failureMessage, isSettled, type ExportJob } from './exportJob';

/**
 * Export of one record from the official template (12 §64–71). Each click is a new request the
 * server freezes into its own snapshot; the page follows only the jobs it started here.
 */
const props = withDefaults(
    defineProps<{
        recordId: number;
        businessStatus: BusinessStatus;
        approvedBy: string | null;
        pollMs?: number;
        navigate?: (url: string) => void;
    }>(),
    { pollMs: 2000, navigate: (url: string) => window.location.assign(url) },
);

const { can } = usePermissions();
const jobs = ref<ExportJob[]>([]);
const requesting = ref(false);
const error = ref<string | null>(null);
let active = true;
onUnmounted(() => (active = false));

function put(job: ExportJob): void {
    const current = jobs.value.find((existing) => existing.id === job.id);
    // A settled state is final: a late, older poll response never takes it back.
    if (current && isSettled(current) && !isSettled(job)) return;
    jobs.value = current
        ? jobs.value.map((existing) => (existing.id === job.id ? job : existing))
        : [job, ...jobs.value];
}

async function follow(id: number): Promise<void> {
    while (active) {
        await new Promise((resolve) => setTimeout(resolve, props.pollMs));
        if (!active) return;
        const result = await sendJson<{ data: ExportJob }>('GET', `/nscmf/exports/${id}`);
        if (!result.ok || !result.body) return;
        put(result.body.data);
        if (isSettled(result.body.data)) return;
    }
}

async function request(format: ExportJob['format']): Promise<void> {
    if (requesting.value) return;
    requesting.value = true;
    error.value = null;
    const result = await sendJson<{ data: ExportJob }>('POST', `/nscmf/${props.recordId}/exports`, { format });
    requesting.value = false;
    if (!result.ok) {
        error.value =
            result.status === 403 || result.status === 404
                ? 'You do not have access to export this record.'
                : result.error?.message || 'The export could not be requested.';
        return;
    }
    if (!result.body) return;
    put(result.body.data);
    if (!isSettled(result.body.data)) void follow(result.body.data.id);
}

async function download(job: ExportJob): Promise<void> {
    const result = await sendJson<{ data: ExportJob }>('GET', `/nscmf/exports/${job.id}`);
    if (result.ok && result.body?.data.status === 'READY' && result.body.data.download_url) {
        props.navigate(result.body.data.download_url);
        return;
    }
    put({ ...job, status: result.ok && result.body ? result.body.data.status : 'EXPIRED', download_url: null });
}
</script>

<template>
    <section
        v-if="can('nscmf.export')"
        aria-label="Export"
        class="space-y-3 rounded-lg border border-border bg-card p-5"
    >
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="font-semibold">Export</h2>
                <p class="text-sm text-muted-foreground">Official NSCMF Form 3.0 as Excel or PDF.</p>
            </div>
            <div class="flex gap-2">
                <Button variant="secondary" data-testid="export-XLSX" :disabled="requesting" @click="request('XLSX')"
                    >Export XLSX</Button
                >
                <Button variant="secondary" data-testid="export-PDF" :disabled="requesting" @click="request('PDF')"
                    >Export PDF</Button
                >
            </div>
        </div>
        <p v-if="businessStatus === 'APPROVED'" class="text-sm">
            Approved by {{ approvedBy ?? '—' }}.
            <Link href="/ispdfvalid" class="text-primary hover:underline">Verify a PDF</Link>
        </p>
        <Alert v-if="error" variant="error" title="Export not started">{{ error }}</Alert>
        <ul v-if="jobs.length" class="divide-y divide-border">
            <li
                v-for="job in jobs"
                :key="job.id"
                :data-testid="`export-job-${job.id}`"
                class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
                <div class="space-y-1">
                    <p class="flex items-center gap-2 font-medium">
                        {{ job.format }}
                        <Badge :variant="job.status === 'READY' ? 'success' : 'neutral'">{{
                            EXPORT_STATUS_LABELS[job.status]
                        }}</Badge>
                    </p>
                    <p class="text-xs text-muted-foreground">Requested {{ formatJakarta(job.requested_at) }}</p>
                    <p v-if="job.status === 'READY' && job.expires_at" class="text-xs text-muted-foreground">
                        Available until {{ formatJakarta(job.expires_at) }}
                    </p>
                    <p v-if="job.status === 'READY' && job.format === 'PDF' && job.signed" class="text-xs">
                        Signed with the NSCMF Organization certificate.
                    </p>
                    <p v-if="job.status === 'FAILED'" role="status" class="text-xs text-destructive">
                        {{ failureMessage(job) }}
                    </p>
                    <p v-if="job.status === 'EXPIRED'" class="text-xs text-muted-foreground">
                        This file expired. Export again for a new copy.
                    </p>
                </div>
                <Button
                    v-if="job.status === 'READY' && job.download_url"
                    size="sm"
                    :data-testid="`export-download-${job.id}`"
                    @click="download(job)"
                    >Download</Button
                >
            </li>
        </ul>
    </section>
</template>
