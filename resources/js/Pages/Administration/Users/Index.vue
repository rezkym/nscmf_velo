<script setup lang="ts">
import UserManager, { type RoleOption, type TeamOption, type UserRow } from '@/features/administration/UserManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(defineProps<{ users?: UserRow[]; teams?: TeamOption[]; roles?: RoleOption[] }>(), {
    users: () => [],
    teams: () => [],
    roles: () => [],
});
</script>

<template>
    <AppLayout title="Users">
        <div class="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Users</h1>
                <p class="text-sm text-muted-foreground">
                    Access comes from roles; a user with several roles gets all of their permissions.
                </p>
            </div>
            <UserManager :users="users" :teams="teams" :roles="roles" />
        </div>
    </AppLayout>
</template>
