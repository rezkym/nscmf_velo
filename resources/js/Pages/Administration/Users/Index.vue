<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { computed } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import Button from '@/components/ui/Button.vue';
import UserManager, { type RoleOption, type TeamOption, type UserRow } from '@/features/administration/UserManager.vue';
import type { PaginationMeta } from '@/features/nscmf/contracts';
import AppLayout from '@/layouts/AppLayout.vue';

const props = withDefaults(
    defineProps<{ users?: UserRow[]; teams?: TeamOption[]; roles?: RoleOption[]; meta?: PaginationMeta | null }>(),
    {
        users: () => [],
        teams: () => [],
        roles: () => [],
        meta: null,
    },
);

const range = computed(() =>
    props.meta && props.meta.from !== null && props.meta.to !== null
        ? `${props.meta.from}–${props.meta.to} of ${props.meta.total}`
        : null,
);

/** Server pagination (12 §13): the page only asks for another page; the server decides its content. */
function goToPage(page: number): void {
    if (!props.meta) return;
    router.get('/administration/users', { page, per_page: props.meta.per_page }, { preserveScroll: true });
}
</script>

<template>
    <AppLayout title="Users">
        <div class="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Users"
                description="Access comes from roles; a user with several roles gets all of their permissions."
            />
            <UserManager :users="users" :teams="teams" :roles="roles" />
            <nav
                v-if="meta && meta.last_page > 1"
                data-testid="users-pagination"
                class="flex items-center justify-between text-sm text-muted-foreground"
                aria-label="Users pages"
            >
                <span>{{ range }}</span>
                <div class="flex gap-2">
                    <Button
                        variant="secondary"
                        data-testid="users-page-previous"
                        :disabled="meta.current_page <= 1"
                        @click="goToPage(meta.current_page - 1)"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="secondary"
                        data-testid="users-page-next"
                        :disabled="meta.current_page >= meta.last_page"
                        @click="goToPage(meta.current_page + 1)"
                    >
                        Next
                    </Button>
                </div>
            </nav>
        </div>
    </AppLayout>
</template>
