<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import SectionCard from '@/components/SectionCard.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/composables/usePermissions';
import { type DiffRow, diffRows } from '@/features/nscmf/timelineDiff';
import { EVENT_LABELS, STATUS_LABELS, type TimelineEvent } from '@/features/nscmf/types';
import { formatJakarta } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

interface TimelinePage {
    data: TimelineEvent[];
    meta: { current_page: number; last_page: number; total: number };
}

/** The read-only business audit stream of one record, each change shown as a split diff (07 §36; 12 §48). */
const props = defineProps<{ recordId: number }>();
const { can } = usePermissions();
const permitted = can('nscmf.timeline.view');
const entries = ref<TimelineEvent[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const controller = new AbortController();

/** Server order is newest first; a group keeps that order and appears where its newest event is. */
const groups = computed(() => {
    const byIteration = new Map<number | null, TimelineEvent[]>();
    for (const entry of entries.value) {
        byIteration.set(entry.iteration_no, [...(byIteration.get(entry.iteration_no) ?? []), entry]);
    }
    return [...byIteration].map(([iteration, events]) => ({
        key: iteration ?? 'none',
        title: iteration === null ? 'Before first submission' : `Iteration ${iteration}`,
        events: events.map((entry) => ({ ...entry, rows: changeRows(entry) })),
    }));
});

/** An attachment event's file is a line of its own: added on the After side, removed on the Before side. */
function changeRows(entry: TimelineEvent): DiffRow[] {
    const file = entry.attachment_filename;
    const attachment: DiffRow[] = file
        ? [
              {
                  label: 'Attachment',
                  before: entry.event_type === 'ATTACHMENT_REMOVED' ? file : null,
                  after: entry.event_type === 'ATTACHMENT_ADDED' ? file : null,
              },
          ]
        : [];
    return [...attachment, ...entry.changes.flatMap(diffRows)];
}

async function load(target = 1): Promise<void> {
    if (loading.value || !permitted) return;
    loading.value = true;
    error.value = null;
    try {
        const result = await sendJson<TimelinePage>(
            'GET',
            `/nscmf/${props.recordId}/timeline?page=${target}&per_page=25`,
            undefined,
            { signal: controller.signal },
        );
        if (!result.ok || !result.body) {
            entries.value = [];
            error.value =
                !result.ok && [401, 403, 404].includes(result.status)
                    ? 'You do not have access to this timeline.'
                    : 'Could not load the timeline.';
            return;
        }
        entries.value = result.body.data;
        page.value = result.body.meta.current_page;
        lastPage.value = result.body.meta.last_page;
    } catch (failure) {
        if (!(failure instanceof DOMException && failure.name === 'AbortError'))
            error.value = 'Could not load the timeline.';
    } finally {
        loading.value = false;
    }
}
onMounted(() => void load());
onUnmounted(() => controller.abort());
</script>

<template>
    <Card v-if="!permitted">
        <CardContent class="text-muted-foreground">You do not have permission to view this timeline.</CardContent>
    </Card>
    <SectionCard v-else title="Business timeline" :aria-busy="loading">
        <template #action>
            <Button type="button" variant="outline" size="sm" :disabled="loading" @click="load(page)">
                Refresh timeline
            </Button>
        </template>
        <p v-if="loading" role="status" class="text-muted-foreground">Loading timeline…</p>
        <Alert v-if="error" variant="destructive">
            <AlertTitle>Timeline unavailable</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <p v-else-if="!loading && entries.length === 0" class="text-muted-foreground">No business events recorded.</p>
        <section v-for="group in groups" :key="group.key" data-testid="timeline-group" class="space-y-3">
            <h3 class="font-medium text-muted-foreground">{{ group.title }}</h3>
            <ol class="space-y-4">
                <li v-for="entry in group.events" :key="entry.id" class="grid gap-1.5 border-l-2 pl-4">
                    <p class="font-medium">{{ EVENT_LABELS[entry.event_type] ?? entry.event_type }}</p>
                    <p class="text-xs text-muted-foreground">
                        {{ entry.actor ?? 'Unknown actor' }} · {{ formatJakarta(entry.occurred_at) }}
                    </p>
                    <p v-if="entry.from_status || entry.to_status" class="text-sm">
                        {{ entry.from_status ? STATUS_LABELS[entry.from_status] : '—' }} →
                        {{ entry.to_status ? STATUS_LABELS[entry.to_status] : '—' }}
                    </p>
                    <p v-if="entry.version_after !== null" class="text-xs text-muted-foreground">
                        Version {{ entry.version_before ?? '—' }} → {{ entry.version_after }}
                    </p>
                    <p v-if="entry.reason" class="whitespace-pre-wrap break-words text-sm">
                        Reason: {{ entry.reason }}
                    </p>
                    <p v-if="entry.comment" class="whitespace-pre-wrap break-words text-sm">
                        Comment: {{ entry.comment }}
                    </p>
                    <!-- A split diff; on a narrow screen each field stacks its Before line above its After line. -->
                    <div v-if="entry.rows.length" class="mt-1 overflow-hidden rounded-md border">
                        <Table data-testid="timeline-changes" class="text-sm">
                            <TableHeader class="hidden sm:table-header-group">
                                <TableRow>
                                    <TableHead class="w-1/4 px-3">Field</TableHead>
                                    <TableHead class="px-3">Before</TableHead>
                                    <TableHead class="px-3">After</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow
                                    v-for="(row, index) in entry.rows"
                                    :key="index"
                                    data-testid="diff-row"
                                    class="block hover:bg-transparent sm:table-row"
                                >
                                    <TableCell
                                        data-diff="field"
                                        class="block px-3 font-medium whitespace-normal break-words sm:table-cell sm:align-top"
                                    >
                                        {{ row.label }}
                                    </TableCell>
                                    <TableCell
                                        data-diff="removed"
                                        :class="[
                                            'block px-3 whitespace-pre-wrap break-words sm:table-cell sm:align-top',
                                            row.before === null
                                                ? 'hidden sm:table-cell'
                                                : 'bg-destructive/10 dark:bg-destructive/20',
                                        ]"
                                    >
                                        <template v-if="row.before !== null">
                                            <span aria-hidden="true" class="mr-2 font-mono text-destructive">−</span>
                                            <span class="sr-only">Removed:</span>{{ row.before }}
                                        </template>
                                    </TableCell>
                                    <TableCell
                                        data-diff="added"
                                        :class="[
                                            'block px-3 whitespace-pre-wrap break-words sm:table-cell sm:align-top',
                                            row.after === null
                                                ? 'hidden sm:table-cell'
                                                : 'bg-success/10 dark:bg-success/20',
                                        ]"
                                    >
                                        <template v-if="row.after !== null">
                                            <span aria-hidden="true" class="mr-2 font-mono text-success">+</span>
                                            <span class="sr-only">Added:</span>{{ row.after }}
                                        </template>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </li>
            </ol>
        </section>
        <nav v-if="lastPage > 1" aria-label="Timeline pages" class="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" :disabled="loading || page <= 1" @click="load(page - 1)"
                >Previous</Button
            >
            <span>Page {{ page }} of {{ lastPage }}</span>
            <Button type="button" variant="outline" :disabled="loading || page >= lastPage" @click="load(page + 1)"
                >Next</Button
            >
        </nav>
    </SectionCard>
</template>
