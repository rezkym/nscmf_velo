<script setup lang="ts" generic="V extends string | number | null">
import FormField from '@/components/ui/FormField.vue';

const value = defineModel<V>({ required: true });

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
}>();
</script>

<template>
    <FormField :id="id" :label="label" :help="help" :error="error" :required="required">
        <template #default="{ id: controlId }">
            <input :id="controlId" />
        </template>
    </FormField>
</template>
