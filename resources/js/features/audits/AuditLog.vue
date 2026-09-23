<script setup lang="ts">
/** The server's echo of the accepted audit query (12 §13, §49–50). */
export interface AuditQuery {
    page: number;
    per_page: number;
    event_type: string | null;
    actor_user_id: number | null;
    occurred_from: string | null;
    occurred_to: string | null;
    outcome: string | null;
}

defineProps<{
    kind: 'access' | 'security';
    items: Record<string, unknown>[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
    query: AuditQuery;
}>();
</script>

<template>
    <div />
</template>
