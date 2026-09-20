<script setup lang="ts" generic="V extends string | number | null">
import FormField from '@/components/ui/FormField.vue';
import { toNullableNumber, toNullableText } from '@/lib/formInputs';

const value = defineModel<V>({ required: true });

const props = withDefaults(
    defineProps<{
        id: string;
        label: string;
        /** `number` parses the input, `date` uses the native picker; everything else is free text. */
        type?: 'text' | 'number' | 'date';
        /** Number of rows for a narrative field; a plain input is used when it is omitted. */
        rows?: number;
        maxlength?: number;
        /** Unit shown next to the control, e.g. "Mbps". */
        suffix?: string;
        help?: string;
        error?: string;
        required?: boolean;
        disabled?: boolean;
    }>(),
    { type: 'text' },
);

const CONTROL_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

function onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    // The caller decides which of the two shapes it stores; the type prop is what tells them apart.
    value.value = (props.type === 'number' ? toNullableNumber(raw) : toNullableText(raw)) as V;
}
</script>

<template>
    <FormField :id="id" :label="label" :help="help" :error="error" :required="required">
        <template #default="{ id: controlId, describedBy }">
            <div class="flex items-center gap-2">
                <textarea
                    v-if="rows"
                    :id="controlId"
                    :value="value ?? ''"
                    :rows="rows"
                    :maxlength="maxlength"
                    :disabled="disabled"
                    :aria-describedby="describedBy"
                    :class="CONTROL_CLASS"
                    @input="onInput"
                />
                <input
                    v-else
                    :id="controlId"
                    :type="type"
                    :value="value ?? ''"
                    :maxlength="maxlength"
                    :inputmode="type === 'number' ? 'decimal' : undefined"
                    :disabled="disabled"
                    :aria-describedby="describedBy"
                    :class="CONTROL_CLASS"
                    @input="onInput"
                />
                <span v-if="suffix" class="shrink-0 text-sm text-muted-foreground">{{ suffix }}</span>
            </div>
        </template>
    </FormField>
</template>
