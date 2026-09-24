<script setup lang="ts">
import { Badge } from '@/components/ui/badge';

import type { BusinessStatus } from './contracts';
import { STATUS_LABELS, STATUS_TONES } from './types';

defineProps<{ status: BusinessStatus }>();
</script>

<template>
    <!-- An unexpected value is shown as sent rather than hidden. -->
    <Badge :variant="STATUS_TONES[status] ?? 'secondary'">{{ STATUS_LABELS[status] ?? status }}</Badge>
</template>
