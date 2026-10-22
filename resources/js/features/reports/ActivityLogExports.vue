<script setup lang="ts">
import { FolderDown, X } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { sendJson } from '@/lib/http';

import ActivityLogExportRow from './ActivityLogExportRow.vue';
import { isLogExportSettled, type LogExportJob } from './types';

/**
 * The actor's Activity Log exports (07 §34.2). The page shows only the latest export as one strip,
 * so requesting more exports never pushes the table down; every retained export is listed in a
 * floating side panel, grouped by what the user can do with them. Percentage and stage come from
 * the server, polled until each job settles.
 */
const props = withDefaults(
    defineProps<{ pollMs?: number; navigate?: (url: string) => void; newExportDisabled?: boolean }>(),
    {
        pollMs: 2000,
        navigate: (url: string) => window.location.assign(url),
        newExportDisabled: false,
    },
);
const emit = defineEmits<{ (e: 'new-export'): void }>();
const panelOpen = defineModel<boolean>('panelOpen', { default: false });

const jobs = ref<LogExportJob[]>([]);
/** The export shown on the page: one requested here, or the newest still running on opening. */
const spotlightId = ref<number | null>(null);
const spotlight = computed(() => jobs.value.find((job) => job.id === spotlightId.value) ?? null);
const activeCount = computed(() => jobs.value.filter((job) => !isLogExportSettled(job)).length);

/** Panel sections in a fixed order, newest first inside each; empty sections are omitted. */
const groups = computed(() =>
    [
        { key: 'in-progress', title: 'In progress', jobs: jobs.value.filter((job) => !isLogExportSettled(job)) },
        { key: 'ready', title: 'Ready to download', jobs: jobs.value.filter((job) => job.status === 'READY') },
        {
            key: 'earlier',
            title: 'Earlier',
            jobs: jobs.value.filter((job) => job.status === 'FAILED' || job.status === 'EXPIRED'),
        },
    ].filter((group) => group.jobs.length > 0),
);
const summary = computed(() => `${jobs.value.length} ${jobs.value.length === 1 ? 'export' : 'exports'}`);

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

function newExport(): void {
    panelOpen.value = false;
    emit('new-export');
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
            :show-close-button="false"
            class="gap-0 overflow-hidden rounded-2xl border shadow-2xl data-[side=right]:inset-y-3 data-[side=right]:right-3 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1.5rem)] data-[side=right]:border data-[side=right]:sm:max-w-md"
        >
            <SheetHeader class="flex-row items-center justify-between gap-4 px-6 pt-6 pb-2">
                <SheetTitle class="text-2xl font-semibold tracking-tight">Exports</SheetTitle>
                <SheetClose as-child>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                        <X aria-hidden="true" />
                    </Button>
                </SheetClose>
            </SheetHeader>

            <div class="min-h-0 flex-1 overflow-y-auto px-6">
                <div class="flex items-center gap-4 py-5">
                    <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                        <FolderDown class="size-6" aria-hidden="true" />
                    </div>
                    <div class="grid gap-0.5">
                        <SheetDescription>Files are kept for 7 days.</SheetDescription>
                        <p class="text-2xl font-semibold tracking-tight">
                            {{ summary }}
                            <span v-if="activeCount > 0" class="text-base font-normal text-muted-foreground">
                                · {{ activeCount }} running
                            </span>
                        </p>
                    </div>
                </div>

                <Empty v-if="jobs.length === 0" class="mb-6 rounded-xl border p-8">
                    <EmptyHeader>
                        <EmptyTitle class="text-base">No exports yet</EmptyTitle>
                        <EmptyDescription>Exports you request appear here.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
                <section
                    v-for="group in groups"
                    :key="group.key"
                    :data-testid="`log-exports-${group.key}`"
                    :aria-labelledby="`log-exports-${group.key}-title`"
                    class="border-t py-5"
                >
                    <h3 :id="`log-exports-${group.key}-title`" class="mb-2 text-base font-semibold">
                        {{ group.title }}
                    </h3>
                    <ul class="grid divide-y">
                        <li
                            v-for="job in group.jobs"
                            :key="job.id"
                            :data-testid="`log-export-${job.id}`"
                            :data-export-id="job.id"
                        >
                            <ActivityLogExportRow
                                plain
                                :job="job"
                                :download-test-id="`log-export-download-${job.id}`"
                                @download="download(job)"
                            />
                        </li>
                    </ul>
                </section>
            </div>

            <SheetFooter class="flex-row items-center justify-end gap-4 border-t px-6 py-4">
                <Button
                    type="button"
                    variant="link"
                    class="text-foreground underline underline-offset-4"
                    data-testid="log-exports-close"
                    @click="panelOpen = false"
                >
                    Close
                </Button>
                <Button
                    type="button"
                    class="rounded-full px-6"
                    data-testid="log-exports-new"
                    :disabled="newExportDisabled"
                    @click="newExport"
                >
                    New export
                </Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
