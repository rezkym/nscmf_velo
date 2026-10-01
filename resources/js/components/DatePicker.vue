<script setup lang="ts">
import { type DateValue, parseDate, today } from '@internationalized/date';
import { CalendarDays } from '@lucide/vue';
import { computed, ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BUSINESS_TIME_ZONE, formatBusinessDate } from '@/lib/datetime';

/**
 * A business date (07 §22.1): shown as `30 Sep 2026`, exchanged as `YYYY-MM-DD` or null. Month
 * and year selects reach a distant date without paging, and every date stays pickable, because an
 * accepted past date may remain (06 §40). Attributes such as
 * `aria-describedby` and `data-testid` land on the trigger, which carries the label's `id`.
 */
defineOptions({ inheritAttrs: false });

const value = defineModel<string | null>({ required: true });

withDefaults(defineProps<{ id?: string; placeholder?: string; disabled?: boolean }>(), {
    id: undefined,
    placeholder: 'Pick a date',
});

const open = ref(false);
const selected = computed(() => (value.value ? parseDate(value.value) : undefined));

function choose(date: DateValue | undefined): void {
    value.value = date ? date.toString() : null;
    open.value = false;
}
</script>

<template>
    <Popover v-model:open="open">
        <PopoverTrigger as-child>
            <Button
                v-bind="$attrs"
                :id="id"
                type="button"
                variant="outline"
                :disabled="disabled"
                :class="['w-full justify-start font-normal', { 'text-muted-foreground': !value }]"
            >
                <CalendarDays class="size-4" aria-hidden="true" />
                {{ value ? formatBusinessDate(value) : placeholder }}
            </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
            <Calendar
                :model-value="selected"
                :default-placeholder="selected ?? today(BUSINESS_TIME_ZONE)"
                layout="month-and-year"
                initial-focus
                @update:model-value="choose"
            />
            <div class="border-t p-2">
                <Button type="button" variant="ghost" size="sm" :disabled="!value" @click="choose(undefined)">
                    Clear
                </Button>
            </div>
        </PopoverContent>
    </Popover>
</template>
