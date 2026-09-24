<script setup lang="ts">
import { computed } from 'vue';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';

/**
 * A labelled form control built from the shadcn Field parts. The slot receives the ids to wire,
 * so the label, help text and error stay linked to the control for assistive technology.
 */
export interface FormFieldProps {
    id: string;
    label?: string;
    help?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<FormFieldProps>(), {
    label: undefined,
    help: undefined,
    error: undefined,
    required: false,
    disabled: false,
    readonly: false,
});

const helpId = computed(() => (props.help ? `${props.id}-help` : undefined));
const errorId = computed(() => (props.error ? `${props.id}-error` : undefined));

const describedBy = computed(() => {
    const ids = [helpId.value, errorId.value].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : undefined;
});
</script>

<template>
    <Field
        :data-invalid="error ? true : undefined"
        :data-disabled="disabled || undefined"
        :class="{ 'pointer-events-none opacity-50': disabled }"
    >
        <FieldLabel v-if="label" :for="id">
            {{ label }}
            <span v-if="required" data-required class="text-destructive" aria-hidden="true">*</span>
        </FieldLabel>

        <slot :id="id" :described-by="describedBy" :disabled="disabled" :readonly="readonly" :has-error="!!error" />

        <FieldDescription v-if="help" :id="helpId">{{ help }}</FieldDescription>
        <FieldError v-if="error" :id="errorId">{{ error }}</FieldError>
    </Field>
</template>
