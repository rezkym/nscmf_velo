<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
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
const props = defineProps<{ recordId: number }>();
const entries = ref<TimelineEvent[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const controller = new AbortController();

function label(value: string): string {
    return value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase());
}

async function load(target = 1): Promise<void> {
    if (loading.value) return;
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
            if (!result.ok && [401, 403, 404].includes(result.status)) entries.value = [];
            error.value = !result.ok
                ? (result.error?.message ?? 'Could not load the timeline.')
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
    <section
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
        <ol class="space-y-4">
            <li v-for="entry in entries" :key="entry.id" class="space-y-2 border-l-2 border-border pl-4">
                <p class="font-medium">{{ label(entry.event_type) }}</p>
                <p class="text-xs text-muted-foreground">
                    {{ entry.actor ?? 'Unknown actor' }} · {{ entry.occurred_at }} ·
                    {{ entry.iteration_no === null ? 'Before first submission' : `Iteration ${entry.iteration_no}` }}
                </p>
                <p v-if="entry.from_status || entry.to_status" class="text-sm">
                    {{ entry.from_status ? label(entry.from_status) : '—' }} →
                    {{ entry.to_status ? label(entry.to_status) : '—' }}
                </p>
                <p v-if="entry.version_after !== null" class="text-xs text-muted-foreground">
                    Version {{ entry.version_before ?? '—' }} → {{ entry.version_after }}
                </p>
                <p v-if="entry.reason" class="whitespace-pre-wrap break-words text-sm">Reason: {{ entry.reason }}</p>
                <p v-if="entry.comment" class="whitespace-pre-wrap break-words text-sm">Comment: {{ entry.comment }}</p>
                <details v-if="entry.changes.length" class="text-sm">
                    <summary class="cursor-pointer">Changed fields ({{ entry.changes.length }})</summary>
                    <dl class="mt-2 space-y-3">
                        <div v-for="change in entry.changes" :key="change.field">
                            <dt class="font-medium">{{ change.field }}</dt>
                            <dd class="whitespace-pre-wrap break-all text-muted-foreground">
                                Before: {{ change.before ?? '—' }}
                            </dd>
                            <dd class="whitespace-pre-wrap break-all">After: {{ change.after ?? '—' }}</dd>
                        </div>
                    </dl>
                </details>
            </li>
        </ol>
        <nav v-if="lastPage > 1" aria-label="Timeline pages" class="flex items-center justify-between gap-3">
            <Button variant="secondary" :disabled="loading || page <= 1" @click="load(page - 1)">Previous</Button>
            <span class="text-sm">Page {{ page }} of {{ lastPage }}</span>
            <Button variant="secondary" :disabled="loading || page >= lastPage" @click="load(page + 1)">Next</Button>
        </nav>
    </section>
</template>
