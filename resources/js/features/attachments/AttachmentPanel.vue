<script setup lang="ts">
import type { AttachmentItem } from './AttachmentList.vue';
import type { AttachmentPolicy } from './attachmentPolicy';

defineProps<{
    recordId: number;
    attachments: AttachmentItem[];
    policy: AttachmentPolicy | null;
    editable: boolean;
    lockedReason: string | null;
}>();
</script>

<template>
    <div />
</template>
