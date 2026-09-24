<script setup lang="ts">
export interface DetailItem {
    key: string;
    label: string;
    value: string;
}

defineProps<{ items: DetailItem[] }>();
</script>

<template>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div v-for="item in items" :key="item.key" class="grid gap-0.5">
            <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
            <dd :data-testid="`field-${item.key}`" class="whitespace-pre-wrap break-words">{{ item.value }}</dd>
        </div>
    </dl>
</template>
