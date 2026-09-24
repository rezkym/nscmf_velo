<script setup lang="ts">
/** The title block every page opens with: title, optional description, context and actions. */
defineProps<{ title: string; description?: string }>();
</script>

<template>
    <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0 space-y-1.5">
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                <slot name="title">{{ title }}</slot>
            </h1>
            <p v-if="description" class="max-w-2xl text-sm text-muted-foreground sm:text-base">{{ description }}</p>
            <slot />
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>
