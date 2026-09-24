<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ChevronRight } from '@lucide/vue';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { SUBTYPE_LABELS } from '@/features/nscmf/types';

import { type AttentionEntry, QUEUE_TITLES } from './queues';

defineProps<{ entries: AttentionEntry[]; hrefFor: (entry: AttentionEntry) => string }>();
</script>

<template>
    <Card data-testid="needs-attention">
        <CardHeader>
            <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
            <Empty v-if="entries.length === 0" class="rounded-lg border p-8">
                <EmptyHeader>
                    <EmptyTitle class="text-base">All caught up</EmptyTitle>
                    <EmptyDescription>Nothing needs your attention right now.</EmptyDescription>
                </EmptyHeader>
            </Empty>
            <ul v-else class="-mx-3 grid">
                <li v-for="entry in entries" :key="entry.record.id">
                    <Item as-child size="sm">
                        <Link :href="hrefFor(entry)">
                            <ItemContent>
                                <ItemTitle class="break-all">{{ entry.record.request_no }}</ItemTitle>
                                <ItemDescription>
                                    {{ SUBTYPE_LABELS[entry.record.subtype]
                                    }}<template v-if="entry.record.team"> · {{ entry.record.team.name }}</template>
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <Badge :variant="entry.queue === 'revisions' ? 'warning' : 'info'">
                                    {{ QUEUE_TITLES[entry.queue] }}
                                </Badge>
                                <ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
                            </ItemActions>
                        </Link>
                    </Item>
                </li>
            </ul>
        </CardContent>
    </Card>
</template>
