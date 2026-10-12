<script setup lang="ts">
import { Download, FileSpreadsheet, FileText } from '@lucide/vue';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import { formatJakarta } from '@/lib/datetime';

import { STAGE_LABELS, entryCount, type LogExportJob } from './types';

/**
 * One Activity Log export: stage, percentage, retention and Download (07 §34.2). The plain form is
 * the panel row: borderless, and a ready file shows a Download link instead of a full bar.
 */
withDefaults(defineProps<{ job: LogExportJob; downloadTestId: string; plain?: boolean }>(), { plain: false });
defineEmits<{ (e: 'download'): void }>();
</script>

<template>
    <Item :variant="plain ? 'default' : 'outline'" size="sm" :class="plain ? 'px-0' : undefined">
        <ItemMedia class="size-10 self-start rounded-full bg-muted text-primary">
            <FileText v-if="job.format === 'PDF'" class="size-5" aria-hidden="true" />
            <FileSpreadsheet v-else class="size-5" aria-hidden="true" />
        </ItemMedia>
        <ItemContent class="min-w-0 grow gap-2" :class="plain ? 'basis-40' : 'basis-60'">
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
                v-if="job.status === 'QUEUED' || job.status === 'PROCESSING' || (job.status === 'READY' && !plain)"
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
                :variant="plain ? 'link' : 'default'"
                :class="plain ? 'px-0' : undefined"
                :data-testid="downloadTestId"
                @click="$emit('download')"
            >
                Download
                <Download v-if="plain" aria-hidden="true" />
            </Button>
            <slot name="actions" />
        </ItemActions>
    </Item>
</template>
