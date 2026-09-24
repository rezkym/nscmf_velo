<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';

import { Button } from '@/components/ui/button';
import CenteredLayout from '@/layouts/CenteredLayout.vue';

defineProps<{
    appName: string;
}>();
</script>

<template>
    <Head title="Welcome" />

    <CenteredLayout :title="appName">
        <div class="flex justify-center">
            <Button as-child>
                <Link href="/login">Sign in</Link>
            </Button>
        </div>
    </CenteredLayout>
</template>
