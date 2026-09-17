<script setup lang="ts">
// Stub for TDD RED phase
export interface BandwidthSectionProps {
    disabled?: boolean;
    readonly?: boolean;
}
withDefaults(defineProps<BandwidthSectionProps>(), {
    disabled: false,
    readonly: false,
});
</script>

<template>
    <section data-testid="bandwidth-section">
        <!-- Stub -->
    </section>
</template>
