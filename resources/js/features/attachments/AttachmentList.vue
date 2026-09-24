<script setup lang="ts">
import { ref } from 'vue';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { sendJson } from '@/lib/http';

export interface AttachmentItem {
    id: number;
    filename: string;
    size_bytes: number;
    security_status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
    download_url: string | null;
}

/**
 * The record's attachments (12 §57–59). Only an explicit whole-file CLEAN verdict offers a
 * private download, and the server is asked again right before it (10; 11A).
 */
const props = withDefaults(
    defineProps<{
        recordId: number;
        attachments: AttachmentItem[];
        manageable?: boolean;
        navigate?: (url: string) => void;
    }>(),
    { manageable: false, navigate: (url: string) => window.location.assign(url) },
);
const emit = defineEmits<{ (e: 'changed'): void }>();

const LABELS = { PENDING: 'Scanning', CLEAN: 'Ready', INFECTED: 'Blocked', FAILED: 'Scan failed' } as const;
const confirming = ref<number | null>(null);
const busy = ref<number | null>(null);
const revoked = ref<number[]>([]);
const messages = ref<Record<number, string>>({});

const downloadable = (attachment: AttachmentItem) =>
    attachment.security_status === 'CLEAN' && attachment.download_url !== null;

async function download(attachment: AttachmentItem): Promise<void> {
    if (!attachment.download_url || busy.value !== null) return;
    busy.value = attachment.id;
    const result = await sendJson('GET', `/nscmf/${props.recordId}/attachments/${attachment.id}`);
    busy.value = null;
    if (result.ok) {
        props.navigate(attachment.download_url);
        return;
    }
    revoked.value.push(attachment.id);
    messages.value[attachment.id] =
        result.status === 0 ? 'Network connection lost. Try again.' : 'This file is no longer available.';
}

async function remove(attachment: AttachmentItem): Promise<void> {
    busy.value = attachment.id;
    const result = await sendJson('DELETE', `/nscmf/${props.recordId}/attachments/${attachment.id}`);
    busy.value = null;
    confirming.value = null;
    if (result.ok) {
        emit('changed');
        return;
    }
    messages.value[attachment.id] = result.error?.message || 'The attachment could not be removed.';
}
</script>

<template>
    <p v-if="attachments.length === 0" class="text-muted-foreground">No attachments on this record.</p>
    <ul v-else class="grid gap-2">
        <li v-for="attachment in attachments" :key="attachment.id">
            <Item variant="outline" size="sm" :data-testid="`attachment-${attachment.id}`">
                <ItemContent>
                    <ItemTitle class="break-all">{{ attachment.filename }}</ItemTitle>
                    <ItemDescription class="flex flex-wrap items-center gap-2">
                        {{ attachment.size_bytes.toLocaleString('en-US') }} bytes
                        <Badge :variant="attachment.security_status === 'CLEAN' ? 'success' : 'warning'">
                            {{ LABELS[attachment.security_status] }}
                        </Badge>
                    </ItemDescription>
                    <p v-if="messages[attachment.id]" role="status" class="text-xs text-destructive">
                        {{ messages[attachment.id] }}
                    </p>
                </ItemContent>
                <ItemActions class="flex-wrap">
                    <Button
                        v-if="downloadable(attachment)"
                        type="button"
                        variant="outline"
                        size="sm"
                        :data-testid="`attachment-download-${attachment.id}`"
                        :disabled="busy !== null || revoked.includes(attachment.id)"
                        @click="download(attachment)"
                    >
                        Download
                    </Button>
                    <span v-else class="text-muted-foreground">Download unavailable</span>
                    <template v-if="manageable">
                        <template v-if="confirming === attachment.id">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                :data-testid="`attachment-confirm-remove-${attachment.id}`"
                                :disabled="busy !== null"
                                @click="remove(attachment)"
                            >
                                Confirm remove
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                :disabled="busy !== null"
                                @click="confirming = null"
                            >
                                Keep
                            </Button>
                        </template>
                        <Button
                            v-else
                            type="button"
                            variant="ghost"
                            size="sm"
                            :data-testid="`attachment-remove-${attachment.id}`"
                            :disabled="busy !== null"
                            @click="confirming = attachment.id"
                        >
                            Remove
                        </Button>
                    </template>
                </ItemActions>
            </Item>
        </li>
    </ul>
</template>
