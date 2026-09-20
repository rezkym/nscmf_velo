<script setup lang="ts" generic="T extends object">
const rows = defineModel<T[]>({ required: true });

defineProps<{
    addLabel: string;
    newRow: () => T;
    max?: number;
    disabled?: boolean;
    emptyHint?: string;
}>();
</script>

<template>
    <div class="space-y-3">
        <div v-for="(row, index) in rows" :key="index">
            <slot :row="row" :index="index" :update="() => {}" />
        </div>
    </div>
</template>
