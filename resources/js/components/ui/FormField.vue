<script setup lang="ts">
export interface FormFieldProps {
    id: string;
    label?: string;
    help?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
}

withDefaults(defineProps<FormFieldProps>(), {
    label: undefined,
    help: undefined,
    error: undefined,
    required: false,
    disabled: false,
    readonly: false,
});
</script>

<template>
    <div class="form-field">
        <!-- Skeleton -->
    </div>
</template>
