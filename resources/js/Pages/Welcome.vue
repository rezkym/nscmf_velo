<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';

import { buttonVariants } from '@/components/ui/button';

defineProps<{
    appName: string;
}>();
</script>

<template>
    <Head title="Welcome" />

    <main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <h1 class="text-2xl font-semibold">{{ appName }}</h1>
        <Link href="/login" :class="buttonVariants()">Sign in</Link>
    </main>
</template>
