<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import { formatJakarta } from '@/lib/datetime';

import { STAGE_LABELS, entryCount, type LogExportJob } from './types';

/** One Activity Log export: stage, percentage, retention and Download (07 §34.2). */
defineProps<{ job: LogExportJob; downloadTestId: string }>();
defineEmits<{ (e: 'download'): void }>();
</script>

<template>
    <Item variant="outline" size="sm">
        <ItemContent class="min-w-0 grow basis-60 gap-2">
            <ItemTitle>
                {{ job.format }} · {{ entryCount(job.entry_count) }}
                <Badge
                    :variant="
                        job.status === 'READY' ? 'success' : job.status === 'FAILED' ? 'destructive' : 'secondary'
                    "
                >
                    {{ STAGE_LABELS[job.stage] }}
                </Badge>
            </ItemTitle>
            <div
                v-if="job.status === 'QUEUED' || job.status === 'PROCESSING' || job.status === 'READY'"
                class="flex items-center gap-3"
            >
                <Progress :model-value="job.progress_percent" class="h-2" :aria-label="`Export ${job.id} progress`" />
                <span class="w-10 shrink-0 text-right text-sm tabular-nums" aria-hidden="true">
                    {{ job.progress_percent }}%
                </span>
            </div>
            <div class="grid gap-0.5 text-xs text-muted-foreground">
                <p>Requested {{ formatJakarta(job.requested_at) }}</p>
                <p v-if="job.status === 'READY' && job.expires_at">
                    Available until {{ formatJakarta(job.expires_at) }}
                </p>
                <p v-if="job.status === 'FAILED'" class="text-destructive">
                    The report could not be generated. Request a new export.
                </p>
                <p v-if="job.status === 'EXPIRED'">This file expired. Export again for a new copy.</p>
            </div>
        </ItemContent>
        <ItemActions>
            <Button
                v-if="job.status === 'READY' && job.download_url"
                type="button"
                size="sm"
                :data-testid="downloadTestId"
                @click="$emit('download')"
            >
                Download
            </Button>
            <slot name="actions" />
        </ItemActions>
    </Item>
</template>
