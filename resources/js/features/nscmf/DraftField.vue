<script setup lang="ts">
import DatePicker from '@/components/DatePicker.vue';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField.vue';
import { toNullableText } from '@/lib/formInputs';

const value = defineModel<string | null>({ required: true });

withDefaults(
    defineProps<{
        id: string;
        label: string;
        /** `date` uses the Date Picker (07 §22.1); `text` is free text. */
        type?: 'text' | 'date';
        /** Number of rows for a narrative field; a single-line input is used when it is omitted. */
        rows?: number;
        maxlength?: number;
        help?: string;
        error?: string;
        errorPath?: string;
        errorWirePath?: string;
        disabled?: boolean;
    }>(),
    { type: 'text' },
);

function onInput(event: Event): void {
    value.value = toNullableText((event.target as HTMLInputElement | HTMLTextAreaElement).value);
}
</script>

<template>
    <FormField :id="id" :label="label" :help="help" :error="error">
        <template #default="{ id: controlId, describedBy }">
            <Textarea
                v-if="rows"
                :id="controlId"
                :data-error-path="errorPath"
                :data-error-wire-path="errorWirePath"
                :model-value="value ?? ''"
                :rows="rows"
                :maxlength="maxlength"
                :disabled="disabled"
                :aria-describedby="describedBy"
                @input="onInput"
            />
            <DatePicker
                v-else-if="type === 'date'"
                v-model="value"
                :id="controlId"
                :data-error-path="errorPath"
                :data-error-wire-path="errorWirePath"
                :disabled="disabled"
                :aria-describedby="describedBy"
            />
            <Input
                v-else
                :id="controlId"
                :data-error-path="errorPath"
                :data-error-wire-path="errorWirePath"
                :model-value="value ?? ''"
                :maxlength="maxlength"
                :disabled="disabled"
                :aria-describedby="describedBy"
                @input="onInput"
            />
        </template>
    </FormField>
</template>
