<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';

import type { BusinessStatus } from './contracts';
import { STATUS_LABELS, STATUS_TONES } from './types';

defineProps<{ status: BusinessStatus }>();
</script>

<template>
    <!-- An unexpected value is shown as sent rather than hidden. -->
    <Badge :variant="STATUS_TONES[status] ?? 'neutral'">{{ STATUS_LABELS[status] ?? status }}</Badge>
</template>
