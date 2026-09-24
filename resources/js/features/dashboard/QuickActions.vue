<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import type { Component } from 'vue';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';

export interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: Component;
}

defineProps<{ actions: QuickAction[] }>();
</script>

<template>
    <Card data-testid="quick-actions">
        <CardHeader>
            <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
            <ul class="grid gap-2">
                <li v-for="action in actions" :key="action.href">
                    <Item as-child variant="outline" size="sm">
                        <Link :href="action.href">
                            <ItemMedia variant="icon" class="text-primary">
                                <component :is="action.icon" aria-hidden="true" />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>{{ action.label }}</ItemTitle>
                                <ItemDescription>{{ action.description }}</ItemDescription>
                            </ItemContent>
                        </Link>
                    </Item>
                </li>
            </ul>
        </CardContent>
    </Card>
</template>
