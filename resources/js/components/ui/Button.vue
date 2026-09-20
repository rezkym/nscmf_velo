<script setup lang="ts">
import { buttonVariants, type ButtonVariants } from './button';

withDefaults(
    defineProps<{
        variant?: ButtonVariants['variant'];
        size?: ButtonVariants['size'];
        type?: 'button' | 'submit';
    }>(),
    { variant: 'primary', size: 'md', type: 'button' },
);
</script>

<template>
    <button :type="type" :class="buttonVariants({ variant, size })">
        <slot />
    </button>
</template>
