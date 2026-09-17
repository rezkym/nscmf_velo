<script setup lang="ts">
// Skeleton for FE-13
export interface OneTimeCredentialProps {
    open?: boolean;
    temporaryPassword?: string | null;
    username?: string | null;
}

withDefaults(defineProps<OneTimeCredentialProps>(), {
    open: false,
    temporaryPassword: null,
    username: null,
});
</script>

<template>
    <div v-if="open" data-testid="one-time-credential-container">
        <!-- Not yet implemented -->
    </div>
</template>
