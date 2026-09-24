<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/FormField.vue';
import { toNullableText } from '@/lib/formInputs';

const value = defineModel<string | null>({ required: true });

withDefaults(
    defineProps<{
        id: string;
        label: string;
        /** `date` uses the native picker; `text` is free text. */
        type?: 'text' | 'date';
        /** Number of rows for a narrative field; a single-line input is used when it is omitted. */
        rows?: number;
        maxlength?: number;
        help?: string;
        error?: string;
        errorPath?: string;
        errorWirePath?: string;
        required?: boolean;
        disabled?: boolean;
    }>(),
    { type: 'text' },
);

function onInput(event: Event): void {
    value.value = toNullableText((event.target as HTMLInputElement | HTMLTextAreaElement).value);
}
</script>

<template>
    <FormField :id="id" :label="label" :help="help" :error="error" :required="required">
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
            <Input
                v-else
                :id="controlId"
                :data-error-path="errorPath"
                :data-error-wire-path="errorWirePath"
                :type="type"
                :model-value="value ?? ''"
                :maxlength="maxlength"
                :disabled="disabled"
                :aria-describedby="describedBy"
                @input="onInput"
            />
        </template>
    </FormField>
</template>
