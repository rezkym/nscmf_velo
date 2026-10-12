<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import SectionCard from '@/components/SectionCard.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import { formatJakarta } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

import { STAGE_LABELS, isLogExportSettled, type LogExportJob } from './types';

/**
 * The actor's Activity Log exports with their progress (07 §34.2): the percentage and stage come
 * from the server, polled until each job settles. Listing the retained exports on opening keeps a
 * READY file downloadable after the user leaves the page.
 */
const props = withDefaults(defineProps<{ pollMs?: number; navigate?: (url: string) => void }>(), {
    pollMs: 2000,
    navigate: (url: string) => window.location.assign(url),
});

const jobs = ref<LogExportJob[]>([]);
let active = true;
onUnmounted(() => (active = false));

function put(job: LogExportJob): void {
    const current = jobs.value.find((existing) => existing.id === job.id);
    // A settled state is final; a late, older poll response never takes it back.
    if (current && isLogExportSettled(current) && !isLogExportSettled(job)) return;
    jobs.value = current
        ? jobs.value.map((existing) => (existing.id === job.id ? job : existing))
        : [job, ...jobs.value];
}

async function follow(id: number): Promise<void> {
    while (active) {
        await new Promise((resolve) => setTimeout(resolve, props.pollMs));
        if (!active) return;
        const result = await sendJson<{ data: LogExportJob }>('GET', `/reports/activity-log/exports/${id}`);
        if (!result.ok || !result.body) return;
        put(result.body.data);
        if (isLogExportSettled(result.body.data)) return;
    }
}

/** Adds a freshly requested export and follows it until it settles. */
function track(job: LogExportJob): void {
    put(job);
    if (!isLogExportSettled(job)) void follow(job.id);
}

async function loadRecent(): Promise<void> {
    try {
        const result = await sendJson<{ data: LogExportJob[] }>('GET', '/reports/activity-log/exports');
        if (!active || !result.ok || !result.body) return;
        for (const job of [...result.body.data].reverse()) track(job);
    } catch {
        // Without the list only exports started here are shown; requesting still works.
    }
}
onMounted(() => void loadRecent());

async function download(job: LogExportJob): Promise<void> {
    const result = await sendJson<{ data: LogExportJob }>('GET', `/reports/activity-log/exports/${job.id}`);
    if (result.ok && result.body?.data.status === 'READY' && result.body.data.download_url) {
        props.navigate(result.body.data.download_url);
        return;
    }
    put({ ...job, status: 'EXPIRED', stage: 'EXPIRED', download_url: null });
}

defineExpose({ track });
</script>

<template>
    <SectionCard v-if="jobs.length" title="Exports" description="Files are kept for 7 days.">
        <ul class="grid gap-2">
            <li v-for="job in jobs" :key="job.id" :data-testid="`log-export-${job.id}`">
                <Item variant="outline" size="sm">
                    <ItemContent class="gap-2">
                        <ItemTitle>
                            {{ job.format }} · {{ job.entry_count }} entries
                            <Badge
                                :variant="
                                    job.status === 'READY'
                                        ? 'success'
                                        : job.status === 'FAILED'
                                          ? 'destructive'
                                          : 'secondary'
                                "
                            >
                                {{ STAGE_LABELS[job.stage] }}
                            </Badge>
                        </ItemTitle>
                        <div
                            v-if="job.status === 'QUEUED' || job.status === 'PROCESSING' || job.status === 'READY'"
                            class="flex items-center gap-3"
                        >
                            <Progress
                                :model-value="job.progress_percent"
                                class="h-2"
                                :aria-label="`Export ${job.id} progress`"
                            />
                            <span class="w-24 shrink-0 text-right text-sm tabular-nums" aria-hidden="true">
                                {{ job.progress_percent }}%
                            </span>
                        </div>
                        <div class="grid gap-0.5 text-xs text-muted-foreground">
                            <p>Requested {{ formatJakarta(job.requested_at) }}</p>
                            <p v-if="job.status === 'READY' && job.expires_at">
                                Available until {{ formatJakarta(job.expires_at) }}
                            </p>
                            <p v-if="job.status === 'FAILED'" role="status" class="text-destructive">
                                The report could not be generated. Request a new export.
                            </p>
                            <p v-if="job.status === 'EXPIRED'">This file expired. Export again for a new copy.</p>
                        </div>
                    </ItemContent>
                    <ItemActions v-if="job.status === 'READY' && job.download_url">
                        <Button
                            type="button"
                            size="sm"
                            :data-testid="`log-export-download-${job.id}`"
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
