<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

defineProps<{
    appName: string;
}>();
</script>

<template>
    <Head title="Welcome" />

    <main class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <h1 class="text-2xl font-semibold">{{ appName }}</h1>
    </main>
</template>
