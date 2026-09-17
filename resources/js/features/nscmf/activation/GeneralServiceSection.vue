<script setup lang="ts">
// Stub for RED test
export interface Props {
    subtype?: string;
    requestDate?: string;
    modelValue?: Record<string, unknown>;
}

withDefaults(defineProps<Props>(), {
    subtype: 'Activation',
    requestDate: '',
    modelValue: () => ({}),
});
</script>

<template>
    <div class="general-service-section-stub">
        FE-20 Stub
    </div>
</template>
