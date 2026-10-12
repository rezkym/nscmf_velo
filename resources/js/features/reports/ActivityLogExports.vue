<script setup lang="ts">
import { X } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { sendJson } from '@/lib/http';

import ActivityLogExportRow from './ActivityLogExportRow.vue';
import { isLogExportSettled, type LogExportJob } from './types';

/**
 * The actor's Activity Log exports (07 §34.2). The page shows only the latest export as one strip,
 * so requesting more exports never pushes the table down; every retained export is listed in a
 * side panel. Percentage and stage come from the server, polled until each job settles.
 */
const props = withDefaults(defineProps<{ pollMs?: number; navigate?: (url: string) => void }>(), {
    pollMs: 2000,
    navigate: (url: string) => window.location.assign(url),
});
const panelOpen = defineModel<boolean>('panelOpen', { default: false });

const jobs = ref<LogExportJob[]>([]);
/** The export shown on the page: one requested here, or the newest still running on opening. */
const spotlightId = ref<number | null>(null);
const spotlight = computed(() => jobs.value.find((job) => job.id === spotlightId.value) ?? null);
const activeCount = computed(() => jobs.value.filter((job) => !isLogExportSettled(job)).length);

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

function watchJob(job: LogExportJob): void {
    put(job);
    if (!isLogExportSettled(job)) void follow(job.id);
}

/** Adds a freshly requested export, shows it on the page and follows it until it settles. */
function track(job: LogExportJob): void {
    watchJob(job);
    spotlightId.value = job.id;
}

async function loadRecent(): Promise<void> {
    try {
        const result = await sendJson<{ data: LogExportJob[] }>('GET', '/reports/activity-log/exports');
        if (!active || !result.ok || !result.body) return;
        for (const job of [...result.body.data].reverse()) watchJob(job);
        spotlightId.value ??= result.body.data.find((job) => !isLogExportSettled(job))?.id ?? null;
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

defineExpose({ track, activeCount });
</script>

<template>
    <section
        v-if="spotlight"
        data-testid="log-export-latest"
        :data-export-id="spotlight.id"
        aria-label="Latest export"
        class="rounded-lg bg-card"
    >
        <ActivityLogExportRow
            :job="spotlight"
            download-test-id="log-export-latest-download"
            @download="download(spotlight)"
        >
            <template #actions>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid="log-export-view-all"
                    @click="panelOpen = true"
                >
                    View all exports
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    data-testid="log-export-dismiss"
                    aria-label="Dismiss"
                    @click="spotlightId = null"
                >
                    <X aria-hidden="true" />
                </Button>
            </template>
        </ActivityLogExportRow>
        <p class="sr-only" role="status">{{ spotlight.format }} export: {{ spotlight.progress_percent }}%</p>
    </section>

    <Sheet :open="panelOpen" @update:open="panelOpen = $event">
        <SheetContent
            data-testid="log-exports-panel"
            class="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
            <SheetHeader class="border-b pr-12">
                <SheetTitle>Exports</SheetTitle>
                <SheetDescription>Files are kept for 7 days.</SheetDescription>
            </SheetHeader>
            <div class="min-h-0 flex-1 overflow-y-auto p-4">
                <Empty v-if="jobs.length === 0" class="rounded-lg border p-8">
                    <EmptyHeader>
                        <EmptyTitle class="text-base">No exports yet</EmptyTitle>
                        <EmptyDescription>Exports you request appear here.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
                <ul v-else class="grid gap-2">
                    <li
                        v-for="job in jobs"
                        :key="job.id"
                        :data-testid="`log-export-${job.id}`"
                        :data-export-id="job.id"
                    >
                        <ActivityLogExportRow
                            :job="job"
                            :download-test-id="`log-export-download-${job.id}`"
                            @download="download(job)"
                        />
                    </li>
                </ul>
            </div>
        </SheetContent>
    </Sheet>
</template>
