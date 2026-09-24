<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { onMounted, onUnmounted, ref } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SectionCard from '@/components/SectionCard.vue';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from '@/features/nscmf/contracts';
import { formatJakarta } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

import { EXPORT_STATUS_LABELS, failureMessage, isSettled, type ExportJob } from './exportJob';

/**
 * Export of one record from the official template (12 §64–71). Each click is a new request the
 * server freezes into its own snapshot. On opening, the panel also lists the actor's exports the
 * server still keeps for this record, so a READY file stays downloadable until it expires (07 §39).
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

async function loadRecent(): Promise<void> {
    try {
        const result = await sendJson<{ data: ExportJob[] }>('GET', `/nscmf/${props.recordId}/exports`);
        if (!active || !result.ok || !result.body) return;
        // Oldest first, so each put() lands newest on top, the order the server sent.
        for (const job of [...result.body.data].reverse()) {
            put(job);
            if (!isSettled(job)) void follow(job.id);
        }
    } catch {
        // No list means only the jobs started here are shown; requesting still works.
    }
}
onMounted(() => {
    if (can('nscmf.export')) void loadRecent();
});

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
    <SectionCard v-if="can('nscmf.export')" title="Export" description="Official NSCMF Form 3.0 as Excel or PDF.">
        <template #action>
            <div class="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    data-testid="export-XLSX"
                    :disabled="requesting"
                    @click="request('XLSX')"
                >
                    Export XLSX
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    data-testid="export-PDF"
                    :disabled="requesting"
                    @click="request('PDF')"
                >
                    Export PDF
                </Button>
            </div>
        </template>

        <p v-if="businessStatus === 'APPROVED'">
            Approved by {{ approvedBy ?? '—' }}.
            <Link href="/ispdfvalid" class="text-primary underline-offset-4 hover:underline">Verify a PDF</Link>
        </p>
        <Alert v-if="error" variant="destructive">
            <AlertTitle>Export not started</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <ul v-if="jobs.length" class="grid gap-2">
            <li v-for="job in jobs" :key="job.id" :data-testid="`export-job-${job.id}`">
                <Item variant="outline" size="sm">
                    <ItemContent>
                        <ItemTitle>
                            {{ job.format }}
                            <Badge :variant="job.status === 'READY' ? 'success' : 'secondary'">
                                {{ EXPORT_STATUS_LABELS[job.status] }}
                            </Badge>
                        </ItemTitle>
                        <div class="grid gap-0.5 text-xs text-muted-foreground">
                            <p>Requested {{ formatJakarta(job.requested_at) }}</p>
                            <p v-if="job.snapshot">
                                Version {{ job.snapshot.record_version
                                }}<template v-if="job.snapshot.iteration_no !== null">
                                    · iteration {{ job.snapshot.iteration_no }}</template
                                >
                                · {{ job.snapshot.template }}
                            </p>
                            <p v-if="job.status === 'READY' && job.expires_at">
                                Available until {{ formatJakarta(job.expires_at) }}
                            </p>
                            <p
                                v-if="job.status === 'READY' && job.format === 'PDF' && job.signed"
                                class="text-foreground"
                            >
                                Signed with the NSCMF Organization certificate.
                            </p>
                            <p v-if="job.status === 'FAILED'" role="status" class="text-destructive">
                                {{ failureMessage(job) }}
                            </p>
                            <p v-if="job.status === 'EXPIRED'">This file expired. Export again for a new copy.</p>
                        </div>
                    </ItemContent>
                    <ItemActions v-if="job.status === 'READY' && job.download_url">
                        <Button
                            type="button"
                            size="sm"
                            :data-testid="`export-download-${job.id}`"
                            @click="download(job)"
                        >
                            Download
                        </Button>
                    </ItemActions>
                </Item>
            </li>
        </ul>
    </SectionCard>
</template>
