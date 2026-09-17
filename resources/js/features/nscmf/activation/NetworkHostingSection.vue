<script setup lang="ts">
import type { ActivationDraftFields } from '../draftPayload';

export interface NetworkHostingProps {
    modelValue?: ActivationDraftFields;
    serverErrors?: Record<string, string>;
    disabled?: boolean;
    readonly?: boolean;
}

withDefaults(defineProps<NetworkHostingProps>(), {
    modelValue: () => ({}),
    serverErrors: () => ({}),
    disabled: false,
    readonly: false,
});
</script>

<template>
    <div data-testid="stub-not-implemented">Stub</div>
</template>
