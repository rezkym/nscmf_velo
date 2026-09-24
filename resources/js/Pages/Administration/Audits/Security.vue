<script setup lang="ts">
import AuditLog, { type AuditQuery } from '@/features/audits/AuditLog.vue';
import AppLayout from '@/layouts/AppLayout.vue';

defineProps<{
    items: Record<string, unknown>[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
    query: AuditQuery;
}>();
</script>

<template>
    <AppLayout title="Security Audit">
        <div class="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Security Audit</h1>
                <p class="text-sm text-muted-foreground">Read-only evidence. Entries cannot be edited or removed.</p>
            </div>
            <AuditLog kind="security" :items="items" :meta="meta" :query="query" />
        </div>
    </AppLayout>
</template>
