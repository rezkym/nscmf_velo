<script setup lang="ts">
import { useId } from 'vue';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * One titled section of a page or form, composed from the shadcn Card. The title is a real h2, so
 * the page outline and the form's section navigator (07 §21) both read it.
 */
defineProps<{ title: string; description?: string }>();

const headingId = useId();
</script>

<template>
    <section :aria-labelledby="headingId">
        <Card>
            <CardHeader>
                <CardTitle class="flex flex-wrap items-center gap-2">
                    <h2 :id="headingId">{{ title }}</h2>
                    <slot name="badge" />
                </CardTitle>
                <CardDescription v-if="description">{{ description }}</CardDescription>
                <CardAction v-if="$slots.action">
                    <slot name="action" />
                </CardAction>
            </CardHeader>
            <!-- A section whose parts are all hidden keeps no empty body. -->
            <CardContent class="grid gap-4 empty:hidden">
                <slot />
            </CardContent>
        </Card>
    </section>
</template>
