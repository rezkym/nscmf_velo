<script setup lang="ts" generic="T extends object">
import { X } from '@lucide/vue';
import { computed } from 'vue';

import Button from '@/components/ui/Button.vue';

const rows = defineModel<T[]>({ required: true });

const props = defineProps<{
    /** Label of the add button, e.g. "Add requirement". */
    addLabel: string;
    /** Builds an empty row; `row_no` is assigned here, so any value is fine. */
    newRow: () => T;
    max?: number;
    disabled?: boolean;
    emptyHint?: string;
}>();

const atMax = computed(() => props.max !== undefined && rows.value.length >= props.max);

/** Row numbers are positional: each row table keys on a unique row_no in its range (11 §19-21, §25-26,
 * §28-29; wire ranges in 12 §27.2, §28.2). Rows without row_no, such as selections, are left alone. */
function renumber(list: T[]): T[] {
    return list.map((row, index) => ('row_no' in row ? { ...row, row_no: index + 1 } : row));
}

function addRow(): void {
    rows.value = renumber([...rows.value, props.newRow()]);
}

function removeRow(index: number): void {
    rows.value = renumber(rows.value.filter((_, position) => position !== index));
}

function updateRow(index: number, patch: Partial<T>): void {
    rows.value = rows.value.map((row, position) => (position === index ? { ...row, ...patch } : row));
}
</script>

<template>
    <div class="space-y-3">
        <p v-if="rows.length === 0 && emptyHint" class="text-sm text-muted-foreground">{{ emptyHint }}</p>

        <div v-for="(row, index) in rows" :key="index" class="flex items-start gap-3">
            <div class="flex-1">
                <slot :row="row" :index="index" :update="(patch: Partial<T>) => updateRow(index, patch)" />
            </div>
            <Button
                variant="ghost"
                size="sm"
                class="mt-1"
                :disabled="disabled"
                :data-testid="`btn-remove-row-${index}`"
                :aria-label="`Remove row ${index + 1}`"
                @click="removeRow(index)"
            >
                <X class="h-4 w-4" aria-hidden="true" />
            </Button>
        </div>

        <Button variant="secondary" size="sm" data-testid="btn-add-row" :disabled="disabled || atMax" @click="addRow">
            {{ addLabel }}
        </Button>
    </div>
</template>
