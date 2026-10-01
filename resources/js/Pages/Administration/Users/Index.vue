<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import type { TablePaginationMeta } from '@/components/ResourceTable.vue';
import type { SearchQuery } from '@/composables/useTableVisit';
import UserManager, { type RoleOption, type TeamOption, type UserRow } from '@/features/administration/UserManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(
    defineProps<{
        users?: UserRow[];
        teams?: TeamOption[];
        roles?: RoleOption[];
        meta: TablePaginationMeta;
        query: SearchQuery;
    }>(),
    {
        users: () => [],
        teams: () => [],
        roles: () => [],
    },
);
</script>

<template>
    <AppLayout title="Users">
        <div class="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Users"
                description="Access comes from roles; a user with several roles gets all of their permissions."
            />
            <UserManager :users="users" :teams="teams" :roles="roles" :meta="meta" :query="query" />
        </div>
    </AppLayout>
</template>
