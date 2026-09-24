<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import type { Component } from 'vue';

export interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: Component;
}

defineProps<{ actions: QuickAction[] }>();
</script>

<template>
    <section data-testid="quick-actions" class="panel p-5 sm:p-6">
        <h2 class="text-lg font-semibold">Quick actions</h2>
        <ul class="mt-3 space-y-2">
            <li v-for="action in actions" :key="action.href">
                <Link
                    :href="action.href"
                    class="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:border-brand-200 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-brand-700">
                        <component :is="action.icon" class="size-[18px]" :stroke-width="1.75" aria-hidden="true" />
                    </span>
                    <span class="min-w-0">
                        <span class="block text-sm font-medium text-heading">{{ action.label }}</span>
                        <span class="block text-xs text-muted-foreground">{{ action.description }}</span>
                    </span>
                </Link>
            </li>
        </ul>
    </section>
</template>
