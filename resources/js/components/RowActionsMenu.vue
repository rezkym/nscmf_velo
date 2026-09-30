<script setup lang="ts">
import { MoreHorizontal } from '@lucide/vue';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowAction {
    label: string;
    testId: string;
    visible: boolean;
    run: () => void;
}

/**
 * One "⋯" menu holding a table row's actions (07 §48). Only visible actions are listed, and a
 * row with none shows no menu. Attributes such as `data-testid` land on the trigger.
 */
defineOptions({ inheritAttrs: false });
const props = defineProps<{ label: string; actions: RowAction[] }>();

const shown = computed(() => props.actions.filter((action) => action.visible));
</script>

<template>
    <DropdownMenu v-if="shown.length > 0" :modal="false">
        <DropdownMenuTrigger as-child>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="label" v-bind="$attrs">
                <MoreHorizontal aria-hidden="true" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem
                v-for="action in shown"
                :key="action.testId"
                :data-testid="action.testId"
                @select="action.run"
            >
                {{ action.label }}
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
