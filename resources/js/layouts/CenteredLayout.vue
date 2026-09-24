<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue';

/** Standalone pages outside the authenticated shell: sign-in, password change, public validator. */
withDefaults(defineProps<{ title: string; description?: string; wide?: boolean }>(), {
    description: undefined,
    wide: false,
});
</script>

<template>
    <main class="flex min-h-screen flex-col items-center bg-background px-4 py-12 text-foreground sm:justify-center">
        <div :class="['w-full space-y-8', wide ? 'max-w-xl' : 'max-w-md']">
            <div class="space-y-3 text-center">
                <BrandMark />
                <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ title }}</h1>
                <p v-if="description" class="text-sm text-muted-foreground sm:text-base">{{ description }}</p>
            </div>
            <slot />
        </div>
    </main>
</template>
