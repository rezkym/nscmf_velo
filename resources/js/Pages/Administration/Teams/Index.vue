<script setup lang="ts">
import TeamManager, { type Team } from '@/features/administration/TeamManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

withDefaults(defineProps<{ teams?: Team[] }>(), { teams: () => [] });
</script>

<template>
    <AppLayout title="Teams">
        <div class="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Teams</h1>
                <p class="text-sm text-muted-foreground">
                    Teams describe where people belong. They do not grant or limit any permission.
                </p>
            </div>
            <TeamManager :teams="teams" />
        </div>
    </AppLayout>
</template>
