<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ChevronRight } from '@lucide/vue';

import { Badge } from '@/components/ui/badge';
import { SUBTYPE_LABELS } from '@/features/nscmf/types';

import { type AttentionEntry, QUEUE_TITLES } from './queues';

defineProps<{ entries: AttentionEntry[]; hrefFor: (entry: AttentionEntry) => string }>();
</script>

<template>
    <section data-testid="needs-attention" class="panel p-5 sm:p-6">
        <h2 class="text-lg font-semibold">Needs attention</h2>
        <p v-if="entries.length === 0" class="mt-2 text-sm text-muted-foreground">
            Nothing needs your attention right now.
        </p>
        <ul v-else class="-mx-2 mt-3 divide-y divide-border">
            <li v-for="entry in entries" :key="entry.record.id">
                <Link
                    :href="hrefFor(entry)"
                    class="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-3 transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span class="min-w-48 flex-1">
                        <span class="block break-all text-sm font-medium text-heading">{{
                            entry.record.request_no
                        }}</span>
                        <span class="block text-xs text-muted-foreground">
                            {{ SUBTYPE_LABELS[entry.record.subtype]
                            }}<template v-if="entry.record.team"> · {{ entry.record.team.name }}</template>
                        </span>
                    </span>
                    <Badge :variant="entry.queue === 'revisions' ? 'warning' : 'info'">{{
                        QUEUE_TITLES[entry.queue]
                    }}</Badge>
                    <ChevronRight
                        class="size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-heading"
                        :stroke-width="1.75"
                        aria-hidden="true"
                    />
                </Link>
            </li>
        </ul>
    </section>
</template>
