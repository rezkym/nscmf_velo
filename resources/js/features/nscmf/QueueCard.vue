<script setup lang="ts">
import { Link } from '@inertiajs/vue3';

import { type RecordSummary, SUBTYPE_LABELS } from './types';

/** Server-provided count for one attention queue. Loading and failure are explicit, never shown as 0. */
export interface QueueCount {
    count?: number | null;
    loading?: boolean;
    error?: string | null;
}

withDefaults(
    defineProps<{
        title: string;
        state?: QueueCount;
        items?: RecordSummary[];
        /** Full queue page, when one exists. */
        href?: string;
        /** Where one listed record opens: the page where this queue's work is done. */
        itemHref?: (item: RecordSummary) => string;
    }>(),
    { state: () => ({}), items: () => [], href: undefined, itemHref: (item: RecordSummary) => `/nscmf/${item.id}` },
);

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
    <section class="space-y-3 rounded-lg border border-border bg-card p-4">
        <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-muted-foreground">{{ title }}</h2>
            <Link v-if="href" :href="href" class="text-xs font-medium text-primary hover:underline">View all</Link>
        </div>

        <p v-if="state.loading" class="text-sm text-muted-foreground">Loading…</p>
        <div v-else-if="state.error" class="space-y-1">
            <p class="text-sm text-destructive">{{ state.error }}</p>
            <button
                type="button"
                data-testid="retry-button"
                class="text-xs font-medium text-foreground underline"
                @click="emit('retry')"
            >
                Retry
            </button>
        </div>
        <p v-else data-testid="count-value" class="text-2xl font-semibold text-foreground">
            <template v-if="typeof state.count === 'number'">{{ state.count }}</template>
            <template v-else>—</template>
        </p>

        <ul v-if="items.length > 0" class="space-y-1 border-t border-border pt-3 text-sm">
            <li v-for="item in items" :key="item.id" class="flex flex-col">
                <!-- The Request No is what the user clicks: it never shrinks; the context text wraps. -->
                <Link :href="itemHref(item)" class="break-all font-medium text-foreground hover:underline">
                    {{ item.request_no }}
                </Link>
                <span class="text-xs text-muted-foreground">
                    {{ SUBTYPE_LABELS[item.subtype] }}<template v-if="item.team"> · {{ item.team.name }}</template>
                </span>
            </li>
        </ul>
    </section>
</template>
