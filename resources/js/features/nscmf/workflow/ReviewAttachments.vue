<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import { buttonVariants } from '@/components/ui/button';

export interface ReviewAttachment {
    id: number;
    filename: string;
    size_bytes: number;
    security_status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
    download_url: string | null;
}
defineProps<{ attachments: ReviewAttachment[] }>();
const labels = { PENDING: 'Scanning', CLEAN: 'Ready', INFECTED: 'Blocked', FAILED: 'Scan failed' } as const;
</script>

<template>
    <section aria-label="Attachments" class="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 class="font-semibold">Attachments</h2>
        <p v-if="attachments.length === 0" class="text-sm text-muted-foreground">No attachments on this record.</p>
        <ul v-else class="divide-y divide-border">
            <li
                v-for="attachment in attachments"
                :key="attachment.id"
                class="flex flex-wrap items-center justify-between gap-3 py-3"
            >
                <div class="min-w-0 space-y-1">
                    <p class="break-all text-sm font-medium">{{ attachment.filename }}</p>
                    <p class="text-xs text-muted-foreground">{{ attachment.size_bytes.toLocaleString() }} bytes</p>
                    <Badge :variant="attachment.security_status === 'CLEAN' ? 'success' : 'warning'">{{
                        labels[attachment.security_status]
                    }}</Badge>
                </div>
                <a
                    v-if="attachment.security_status === 'CLEAN' && attachment.download_url"
                    :href="attachment.download_url"
                    :class="buttonVariants({ variant: 'secondary' })"
                    >Download</a
                >
                <span v-else class="text-sm text-muted-foreground">Download unavailable</span>
            </li>
        </ul>
    </section>
</template>
