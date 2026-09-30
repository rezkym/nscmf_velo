<script setup lang="ts">
/** A business date picker (07 §22.1). Skeleton only: the behaviour arrives with FE-61. */
defineModel<string | null>({ required: true });

withDefaults(defineProps<{ id?: string; placeholder?: string; disabled?: boolean }>(), {
    id: undefined,
    placeholder: 'Pick a date',
});
</script>

<template>
    <button :id="id" type="button" :disabled="disabled" />
</template>
