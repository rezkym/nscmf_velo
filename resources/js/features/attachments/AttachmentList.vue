<script setup lang="ts">
export interface AttachmentItem {
    id: number;
    filename: string;
    size_bytes: number;
    security_status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
    download_url: string | null;
}

defineProps<{
    recordId: number;
    attachments: AttachmentItem[];
    manageable?: boolean;
    navigate?: (url: string) => void;
}>();
</script>

<template>
    <div />
</template>
