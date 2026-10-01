<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import type { TablePaginationMeta } from '@/components/ResourceTable.vue';
import type { SearchQuery } from '@/composables/useTableVisit';
import TeamManager, { type Team } from '@/features/administration/TeamManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(defineProps<{ teams?: Team[]; meta: TablePaginationMeta; query: SearchQuery }>(), { teams: () => [] });
</script>

<template>
    <AppLayout title="Teams">
        <div class="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Teams"
                description="Teams describe where people belong. They do not grant or limit any permission."
            />
            <TeamManager :teams="teams" :meta="meta" :query="query" />
        </div>
    </AppLayout>
</template>
