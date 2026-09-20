<script lang="ts">
import type { ChangeResultRow } from '@/features/nscmf/types';

export function buildChangeResultsPayload(
    _recordVersion: number,
    _results: ChangeResultRow[],
): { record_version: number; results: ChangeResultRow[] } {
    return { record_version: 0, results: [] };
}
</script>

<script setup lang="ts">
import type { NscmfDetailRecord } from '@/Pages/Nscmf/Show.vue';

defineProps<{ record: NscmfDetailRecord }>();
</script>

<template>
    <div data-testid="change-results-page">
        <!-- Stub -->
    </div>
</template>
