<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';

import { buttonVariants } from '@/components/ui/button';
import CenteredLayout from '@/layouts/CenteredLayout.vue';

defineProps<{
    appName: string;
}>();
</script>

<template>
    <Head title="Welcome" />

    <CenteredLayout :title="appName">
        <div class="flex justify-center">
            <Link href="/login" :class="buttonVariants()">Sign in</Link>
        </div>
    </CenteredLayout>
</template>
