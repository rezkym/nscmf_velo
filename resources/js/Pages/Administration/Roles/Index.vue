<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import type { TablePaginationMeta } from '@/components/ResourceTable.vue';
import type { SearchQuery } from '@/composables/useTableVisit';
import RoleManager, { type PermissionCatalogItem, type RoleRow } from '@/features/administration/RoleManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(
    defineProps<{
        roles?: RoleRow[];
        permissionCatalog?: PermissionCatalogItem[];
        meta: TablePaginationMeta;
        query: SearchQuery;
    }>(),
    {
        roles: () => [],
        permissionCatalog: () => [],
    },
);
</script>

<template>
    <AppLayout title="Roles">
        <div class="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Roles"
                description="Roles group permissions. A user with several roles gets all of their permissions; changing a role's permissions signs affected users out."
            />
            <RoleManager :roles="roles" :permission-catalog="permissionCatalog" :meta="meta" :query="query" />
        </div>
    </AppLayout>
</template>
