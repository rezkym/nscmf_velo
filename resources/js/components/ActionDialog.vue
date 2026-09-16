<script setup lang="ts">
export interface ActionDialogProps {
    open: boolean;
    title: string;
    requestNo?: string;
    reasonRequired?: boolean;
    pending?: boolean;
    error?: string;
    consequence?: string;
    destination?: string;
    triggerElement?: HTMLElement | null;
}

withDefaults(defineProps<ActionDialogProps>(), {
    requestNo: undefined,
    reasonRequired: false,
    pending: false,
    error: undefined,
    consequence: undefined,
    destination: undefined,
    triggerElement: null,
});
</script>

<template>
    <div v-if="open" class="action-dialog">
        <textarea></textarea>
        <button data-test="confirm-button">Confirm</button>
    </div>
</template>
