<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Standalone pages outside the authenticated shell: sign-in, password change, public validator. */
withDefaults(defineProps<{ title: string; description?: string; wide?: boolean }>(), {
    description: undefined,
    wide: false,
});
</script>

<template>
    <main class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-foreground">
        <p class="flex items-center gap-2.5 font-semibold text-heading">
            <BrandMark />
            NSCMF
        </p>
        <Card :class="['w-full', wide ? 'max-w-xl' : 'max-w-md']">
            <CardHeader class="text-center">
                <CardTitle>
                    <h1 class="text-xl font-semibold">{{ title }}</h1>
                </CardTitle>
                <CardDescription v-if="description">{{ description }}</CardDescription>
            </CardHeader>
            <CardContent>
                <slot />
            </CardContent>
        </Card>
    </main>
</template>
