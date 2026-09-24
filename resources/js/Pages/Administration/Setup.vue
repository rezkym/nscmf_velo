<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import RoleManager, { type PermissionCatalogItem, type RoleRow } from '@/features/administration/RoleManager.vue';
import TeamManager, { type Team } from '@/features/administration/TeamManager.vue';
import UserManager, { type UserRow } from '@/features/administration/UserManager.vue';
import AppLayout from '@/layouts/AppLayout.vue';

/**
 * Server projection of how far setup has progressed. The wizard never marks anything complete itself:
 * the API contract has no setup-specific endpoints (gap G01), so every step uses the normal
 * administration routes and the server derives readiness from the resulting data.
 */
export interface SetupReadiness {
    roles_configured: boolean;
    teams_configured: boolean;
    users_configured: boolean;
    setup_completed: boolean;
    signing_ready: boolean;
}

const props = withDefaults(
    defineProps<{
        readiness: SetupReadiness;
        roles?: RoleRow[];
        teams?: Team[];
        users?: UserRow[];
        permissionCatalog?: PermissionCatalogItem[];
    }>(),
    { roles: () => [], teams: () => [], users: () => [], permissionCatalog: () => [] },
);

const STEPS = ['Role setup', 'Team setup', 'Users and roles', 'Complete'] as const;
const LAST_STEP = STEPS.length;

function firstIncompleteStep(readiness: SetupReadiness): number {
    if (readiness.setup_completed) return LAST_STEP;
    if (!readiness.roles_configured) return 1;
    if (!readiness.teams_configured) return 2;
    if (!readiness.users_configured) return 3;
    return LAST_STEP;
}

const currentStep = ref(firstIncompleteStep(props.readiness));

// If the server reports an earlier step as incomplete again, go back to it.
watch(
    () => props.readiness,
    (readiness) => {
        currentStep.value = Math.min(currentStep.value, firstIncompleteStep(readiness));
    },
);

// Steps 1-3 may only be left forwards once the server reports them configured.
const canAdvance = computed(
    () =>
        [props.readiness.roles_configured, props.readiness.teams_configured, props.readiness.users_configured][
            currentStep.value - 1
        ] === true,
);

const roleMode = ref<'default' | 'manual'>('default');

const readinessSummary = computed(() => [
    { key: 'roles', label: 'Roles', done: props.readiness.roles_configured, count: props.roles.length },
    { key: 'teams', label: 'Teams', done: props.readiness.teams_configured, count: props.teams.length },
    { key: 'users', label: 'Users', done: props.readiness.users_configured, count: props.users.length },
]);
</script>

<template>
    <AppLayout title="Setup">
        <div class="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Initial setup"
                description="Set up roles, teams and users before people start working."
            />

            <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Setup progress">
                <li
                    v-for="(title, index) in STEPS"
                    :key="title"
                    data-testid="stepper-step"
                    :aria-current="currentStep === index + 1 ? 'step' : undefined"
                    class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    :class="
                        currentStep === index + 1
                            ? 'border-primary text-foreground'
                            : 'border-border text-muted-foreground'
                    "
                >
                    <span class="font-mono text-xs">{{ index + 1 }}</span>
                    <span class="font-medium">{{ title }}</span>
                </li>
            </ol>

            <section v-if="currentStep === 1" class="space-y-4 panel p-6">
                <div class="space-y-1">
                    <h2 class="text-base font-semibold">Role setup</h2>
                    <p class="text-sm text-muted-foreground">
                        Start from the default roles provided by the system, or configure roles and their permissions
                        yourself.
                    </p>
                </div>

                <RadioGroup v-model="roleMode" aria-label="Role setup" class="flex flex-wrap gap-6">
                    <Field orientation="horizontal" class="w-auto">
                        <RadioGroupItem id="role-mode-default" value="default" data-testid="role-mode-default" />
                        <FieldLabel for="role-mode-default" class="font-normal">Use the default roles</FieldLabel>
                    </Field>
                    <Field orientation="horizontal" class="w-auto">
                        <RadioGroupItem id="role-mode-manual" value="manual" data-testid="role-mode-manual" />
                        <FieldLabel for="role-mode-manual" class="font-normal">Configure roles manually</FieldLabel>
                    </Field>
                </RadioGroup>

                <div v-if="roleMode === 'default'" data-testid="default-roles" class="flex flex-wrap gap-2">
                    <Badge variant="secondary" v-for="role in roles" :key="role.id">{{ role.name }}</Badge>
                    <p v-if="roles.length === 0" class="text-sm text-muted-foreground">No roles are available yet.</p>
                </div>
                <RoleManager v-else :roles="roles" :permission-catalog="permissionCatalog" />
            </section>

            <section v-if="currentStep === 2" class="space-y-4 panel p-6">
                <div class="space-y-1">
                    <h2 class="text-base font-semibold">Team setup</h2>
                    <p class="text-sm text-muted-foreground">
                        Teams describe where people belong. They do not grant or limit any permission.
                    </p>
                </div>
                <TeamManager :teams="teams" />
            </section>

            <section v-if="currentStep === 3" class="space-y-4 panel p-6">
                <div class="space-y-1">
                    <h2 class="text-base font-semibold">Users and roles</h2>
                    <p class="text-sm text-muted-foreground">
                        Create users and give each a team and one or more roles.
                    </p>
                </div>
                <UserManager :users="users" :teams="teams" :roles="roles" />
            </section>

            <section v-if="currentStep === LAST_STEP" data-testid="step-complete" class="space-y-4 panel p-6">
                <h2 class="text-base font-semibold">Complete</h2>
                <ul class="divide-y divide-border text-sm">
                    <li
                        v-for="item in readinessSummary"
                        :key="item.key"
                        :data-testid="`readiness-${item.key}`"
                        class="flex items-center justify-between py-2"
                    >
                        <span
                            >{{ item.label }} <span class="text-muted-foreground">({{ item.count }})</span></span
                        >
                        <Badge :variant="item.done ? 'success' : 'warning'">{{
                            item.done ? 'Done' : 'Not done'
                        }}</Badge>
                    </li>
                    <li data-testid="signing-readiness-status" class="flex items-center justify-between py-2">
                        <span>Approved PDF signing</span>
                        <Badge :variant="readiness.signing_ready ? 'success' : 'warning'">
                            {{ readiness.signing_ready ? 'Ready' : 'Not configured' }}
                        </Badge>
                    </li>
                </ul>
                <Link
                    v-if="readiness.setup_completed"
                    href="/dashboard"
                    data-testid="btn-go-dashboard"
                    :class="buttonVariants()"
                >
                    Go to dashboard
                </Link>
                <p v-else class="text-sm text-muted-foreground">
                    The dashboard becomes available once the server reports setup as completed.
                </p>
            </section>

            <div class="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    data-testid="btn-prev-step"
                    :disabled="currentStep === 1"
                    @click="currentStep--"
                >
                    Back
                </Button>
                <Button
                    type="button"
                    v-if="currentStep < LAST_STEP"
                    data-testid="btn-next-step"
                    :disabled="!canAdvance"
                    @click="currentStep++"
                >
                    Next
                </Button>
            </div>
        </div>
    </AppLayout>
</template>
