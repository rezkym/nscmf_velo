<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowUpRight } from '@lucide/vue';

import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { QueueCount } from '@/features/dashboard/types';

import { type RecordSummary, SUBTYPE_LABELS } from './types';

withDefaults(
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
</script>

<template>
    <!-- The highlighted card borrows the dark token set, so every part stays readable on navy. -->
    <Card :class="featured ? 'dark bg-brand-950 text-card-foreground ring-0' : undefined">
        <CardHeader>
            <CardTitle class="text-muted-foreground">{{ title }}</CardTitle>
            <CardAction v-if="href">
                <Button as-child variant="ghost" size="icon-sm" class="-mt-1 -mr-2 text-muted-foreground">
                    <Link :href="href">
                        <ArrowUpRight aria-hidden="true" />
                        <span class="sr-only">View all</span>
                    </Link>
                </Button>
            </CardAction>
        </CardHeader>

        <CardContent class="grid gap-1">
            <div v-if="state.loading" role="status" class="py-1">
                <Skeleton class="h-10 w-16" />
                <span class="sr-only">Loading…</span>
            </div>
            <div v-else-if="state.error" class="grid justify-items-start gap-1">
                <p class="text-destructive">{{ state.error }}</p>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    class="h-auto px-0"
                    data-testid="retry-button"
                    @click="emit('retry')"
                >
                    Retry
                </Button>
            </div>
            <p v-else data-testid="count-value" class="text-4xl font-semibold tracking-tight tabular-nums text-heading">
                <template v-if="typeof state.count === 'number'">{{ state.count }}</template>
                <template v-else>—</template>
            </p>
            <p v-if="caption" class="text-muted-foreground">{{ caption }}</p>
        </CardContent>

        <CardContent v-if="items.length > 0">
            <ul class="grid gap-2.5 border-t pt-4">
                <li v-for="item in items" :key="item.id" class="grid">
                    <!-- The Request No is what the user clicks: it never shrinks; the context text wraps. -->
                    <Link
                        :href="itemHref(item)"
                        class="break-all font-medium text-heading underline-offset-4 hover:underline"
                    >
                        {{ item.request_no }}
                    </Link>
                    <span class="text-xs text-muted-foreground">
                        {{ SUBTYPE_LABELS[item.subtype] }}<template v-if="item.team"> · {{ item.team.name }}</template>
                    </span>
                </li>
            </ul>
        </CardContent>
    </Card>
</template>
