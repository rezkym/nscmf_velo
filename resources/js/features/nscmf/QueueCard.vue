<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowUpRight } from '@lucide/vue';
import { computed } from 'vue';

import type { QueueCount } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

import { type RecordSummary, SUBTYPE_LABELS } from './types';

const props = withDefaults(
    defineProps<{
        title: string;
        caption?: string;
        /** The one highlighted card of the row (07 §7.1). */
        featured?: boolean;
        state?: QueueCount;
        items?: RecordSummary[];
        /** Full queue page, when one exists. */
        href?: string;
        /** Where one listed record opens: the page where this queue's work is done. */
        itemHref?: (item: RecordSummary) => string;
    }>(),
    {
        caption: undefined,
        featured: false,
        state: () => ({}),
        items: () => [],
        href: undefined,
        itemHref: (item: RecordSummary) => `/nscmf/${item.id}`,
    },
);

const emit = defineEmits<{ retry: [] }>();

// Text on the featured gradient stays white; everything else uses the ordinary text tokens.
const tone = computed(() =>
    props.featured
        ? {
              title: 'text-white/80',
              value: 'text-white',
              muted: 'text-white/75',
              link: 'text-white',
              rule: 'border-white/20',
          }
        : {
              title: 'text-muted-foreground',
              value: 'text-heading',
              muted: 'text-muted-foreground',
              link: 'text-heading',
              rule: 'border-border',
          },
);
</script>

<template>
    <section :class="cn('panel flex flex-col gap-4 p-5', featured && 'bg-linear-to-br from-brand-950 to-brand-700')">
        <div class="flex items-start justify-between gap-3">
            <h2 :class="cn('text-base font-medium', tone.title)">{{ title }}</h2>
            <Link
                v-if="href"
                :href="href"
                :class="
                    cn(
                        'inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        featured
                            ? 'border-white/30 text-white hover:bg-white/10'
                            : 'border-border text-heading hover:bg-muted',
                    )
                "
            >
                <span class="sr-only">View all</span>
                <ArrowUpRight class="size-4" :stroke-width="2" aria-hidden="true" />
            </Link>
        </div>

        <div>
            <p v-if="state.loading" :class="cn('text-sm', tone.muted)">Loading…</p>
            <div v-else-if="state.error" class="space-y-1">
                <p :class="cn('text-sm', featured ? 'text-white' : 'text-destructive')">{{ state.error }}</p>
                <button
                    type="button"
                    data-testid="retry-button"
                    :class="cn('text-sm font-medium underline underline-offset-2', tone.link)"
                    @click="emit('retry')"
                >
                    Retry
                </button>
            </div>
            <p
                v-else
                data-testid="count-value"
                :class="cn('text-4xl font-semibold tracking-tight tabular-nums', tone.value)"
            >
                <template v-if="typeof state.count === 'number'">{{ state.count }}</template>
                <template v-else>—</template>
            </p>
            <p v-if="caption" :class="cn('mt-1 text-sm', tone.muted)">{{ caption }}</p>
        </div>

        <ul v-if="items.length > 0" :class="cn('space-y-2 border-t pt-3 text-sm', tone.rule)">
            <li v-for="item in items" :key="item.id" class="flex flex-col">
                <!-- The Request No is what the user clicks: it never shrinks; the context text wraps. -->
                <Link
                    :href="itemHref(item)"
                    :class="cn('break-all font-medium underline-offset-2 hover:underline', tone.link)"
                >
                    {{ item.request_no }}
                </Link>
                <span :class="cn('text-xs', tone.muted)">
                    {{ SUBTYPE_LABELS[item.subtype] }}<template v-if="item.team"> · {{ item.team.name }}</template>
                </span>
            </li>
        </ul>
    </section>
</template>
