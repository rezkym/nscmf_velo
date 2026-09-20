<script setup lang="ts">
import RoleManager, { type PermissionCatalogItem, type RoleRow } from '@/features/administration/RoleManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(defineProps<{ roles?: RoleRow[]; permissionCatalog?: PermissionCatalogItem[] }>(), {
    roles: () => [],
    permissionCatalog: () => [],
});
</script>

<template>
    <AppLayout title="Roles">
        <div class="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Roles</h1>
                <p class="text-sm text-muted-foreground">
                    Roles group permissions. A user with several roles gets all of their permissions; changing a role's
                    permissions signs affected users out.
                </p>
            </div>
            <RoleManager :roles="roles" :permission-catalog="permissionCatalog" />
        </div>
    </AppLayout>
</template>
