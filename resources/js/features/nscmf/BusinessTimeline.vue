<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import { formatJakarta } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

interface TimelineEvent {
    id: number;
    event_type: string;
    actor: string | null;
    iteration_no: number | null;
    from_status: string | null;
    to_status: string | null;
    reason: string | null;
    comment: string | null;
    version_before: number | null;
    version_after: number | null;
    occurred_at: string;
    changes: { field: string; before: string | null; after: string | null }[];
}
interface TimelinePage {
    data: TimelineEvent[];
    meta: { current_page: number; last_page: number; total: number };
}

/** The read-only business audit stream of one record (07 §timeline; 12 §33). */
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
        events,
    }));
});

function label(value: string): string {
    return value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase());
}

const value = (text: string | null) => (text === null || text === '' ? '(empty)' : text);

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
    <p v-if="!permitted" class="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        You do not have permission to view this timeline.
    </p>
    <section
        v-else
        aria-label="Business timeline"
        :aria-busy="loading"
        class="space-y-4 rounded-lg border border-border bg-card p-6"
    >
        <div class="flex items-center justify-between gap-3">
            <h2 class="font-semibold">Business timeline</h2>
            <Button variant="secondary" :disabled="loading" @click="load(page)">Refresh timeline</Button>
        </div>
        <p v-if="loading" role="status" class="text-sm text-muted-foreground">Loading timeline…</p>
        <Alert v-if="error" variant="error" title="Timeline unavailable">{{ error }}</Alert>
        <p v-else-if="!loading && entries.length === 0" class="text-sm text-muted-foreground">
            No business events recorded.
        </p>
        <section v-for="group in groups" :key="group.key" data-testid="timeline-group" class="space-y-3">
            <h3 class="text-sm font-semibold text-muted-foreground">{{ group.title }}</h3>
            <ol class="space-y-4">
                <li v-for="entry in group.events" :key="entry.id" class="space-y-2 border-l-2 border-border pl-4">
                    <p class="font-medium">{{ label(entry.event_type) }}</p>
                    <p class="text-xs text-muted-foreground">
                        {{ entry.actor ?? 'Unknown actor' }} · {{ formatJakarta(entry.occurred_at) }}
                    </p>
                    <p v-if="entry.from_status || entry.to_status" class="text-sm">
                        {{ entry.from_status ? label(entry.from_status) : '—' }} →
                        {{ entry.to_status ? label(entry.to_status) : '—' }}
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
                    <details v-if="entry.changes.length" class="text-sm">
                        <summary class="cursor-pointer">Changed fields ({{ entry.changes.length }})</summary>
                        <dl data-testid="timeline-changes" class="mt-2 space-y-3">
                            <div v-for="change in entry.changes" :key="change.field">
                                <dt class="font-medium">{{ change.field }}</dt>
                                <dd class="whitespace-pre-wrap break-all text-muted-foreground">
                                    Before: {{ value(change.before) }}
                                </dd>
                                <dd class="whitespace-pre-wrap break-all">After: {{ value(change.after) }}</dd>
                            </div>
                        </dl>
                    </details>
                </li>
            </ol>
        </section>
        <nav v-if="lastPage > 1" aria-label="Timeline pages" class="flex items-center justify-between gap-3">
            <Button variant="secondary" :disabled="loading || page <= 1" @click="load(page - 1)">Previous</Button>
            <span class="text-sm">Page {{ page }} of {{ lastPage }}</span>
            <Button variant="secondary" :disabled="loading || page >= lastPage" @click="load(page + 1)">Next</Button>
        </nav>
    </section>
</template>
