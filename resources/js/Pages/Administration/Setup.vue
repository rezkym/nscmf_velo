<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Shield,
    ShieldAlert,
    ShieldCheck,
} from '@lucide/vue';
import { computed, onUnmounted, ref, watch } from 'vue';

import FormField from '@/components/ui/FormField.vue';
import OneTimeCredential from '@/features/administration/OneTimeCredential.vue';

export interface SetupReadiness {
    roles_configured: boolean;
    teams_configured: boolean;
    users_configured: boolean;
    setup_completed: boolean;
    signing_ready: boolean;
}

export interface PermissionCatalogItem {
    name: string;
    group: string;
    description?: string;
}

export interface RoleItem {
    id: number;
    name: string;
    is_protected?: boolean;
    permissions: string[];
}

export interface TeamItem {
    id: number;
    name: string;
    is_active?: boolean;
}

export interface UserItem {
    id: number;
    name: string;
    username: string;
    team_id: number | null;
    team_name?: string | null;
    is_active: boolean;
    is_protected_superadmin: boolean;
    roles: { id: number; name: string }[];
}

const props = withDefaults(
    defineProps<{
        readiness?: SetupReadiness;
        roles?: RoleItem[];
        teams?: TeamItem[];
        users?: UserItem[];
        permissionCatalog?: PermissionCatalogItem[];
        userPermissions?: string[];
        flash?: {
            temporary_password?: string;
            username?: string;
            success?: string;
            error?: string;
        };
    }>(),
    {
        readiness: () => ({
            roles_configured: false,
            teams_configured: false,
            users_configured: false,
            setup_completed: false,
            signing_ready: false,
        }),
        roles: () => [],
        teams: () => [],
        users: () => [],
        permissionCatalog: () => [],
        userPermissions: () => [],
        flash: () => ({}),
    },
);

// 4 Exact Steps definition (AC1)
const steps = [
    { id: 1, title: 'Role Setup', description: 'Configure system roles and permission mappings' },
    { id: 2, title: 'Team Setup', description: 'Define organizational Teams' },
    { id: 3, title: 'Users & Role Assignment', description: 'Create operational users with Team and Roles' },
    { id: 4, title: 'Complete', description: 'Verify setup completion and system readiness' },
] as const;

// Determine initial step position strictly based on server readiness projection (AC4, B-15-3)
function calculateInitialStep(): number {
    if (props.readiness.setup_completed) return 4;
    if (!props.readiness.roles_configured) return 1;
    if (!props.readiness.teams_configured) return 2;
    if (!props.readiness.users_configured) return 3;
    return 4;
}

const currentStep = ref<number>(calculateInitialStep());

// If server props refresh / readiness changes, synchronize current step if necessary
watch(
    () => props.readiness,
    (newVal) => {
        // Only automatically forward if currently stuck behind an unconfigured step
        if (!newVal.roles_configured && currentStep.value > 1) {
            currentStep.value = 1;
        } else if (!newVal.teams_configured && currentStep.value > 2) {
            currentStep.value = 2;
        } else if (!newVal.users_configured && currentStep.value > 3) {
            currentStep.value = 3;
        }
    },
    { deep: true },
);

// Gate moving forward: Forward HANYA setelah response yang diperlukan berhasil (AC2)
// Readiness server projection is the sole gate (B-15-1)
const isStepReadyToAdvance = computed(() => {
    switch (currentStep.value) {
        case 1:
            return props.readiness.roles_configured;
        case 2:
            return props.readiness.teams_configured;
        case 3:
            return props.readiness.users_configured;
        case 4:
            return true;
        default:
            return false;
    }
});

function nextStep(): void {
    if (isStepReadyToAdvance.value && currentStep.value < 4) {
        currentStep.value++;
    }
}

function prevStep(): void {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
}

// -------------------------------------------------------------
// STEP 1: ROLE SETUP (Template vs Manual)
// -------------------------------------------------------------
const roleMode = ref<'template' | 'manual'>('template');

const templateForm = useForm({
    template: 'standard',
});

function applyRoleTemplate(): void {
    if (templateForm.processing) return;
    templateForm.post('/administration/roles/template', {
        onSuccess: () => {
            // Next step will become enabled via props readiness or local check
        },
    });
}

// Manual Role Creation Form
const manualRoleForm = useForm({
    name: '',
    permissions: [] as string[],
});

function toggleManualPermission(permName: string): void {
    if (manualRoleForm.permissions.includes(permName)) {
        manualRoleForm.permissions = manualRoleForm.permissions.filter((p) => p !== permName);
    } else {
        manualRoleForm.permissions.push(permName);
    }
}

function submitManualRole(): void {
    if (manualRoleForm.processing) return;
    manualRoleForm.post('/administration/roles', {
        onSuccess: () => {
            manualRoleForm.reset();
            manualRoleForm.clearErrors();
        },
    });
}

// Group permissions for manual setup
const groupedPermissions = computed(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    for (const item of props.permissionCatalog) {
        const g = item.group || 'General';
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
    }
    return groups;
});

// -------------------------------------------------------------
// STEP 2: TEAM SETUP (Organizational Only)
// -------------------------------------------------------------
const teamForm = useForm({
    name: '',
});

function submitTeam(): void {
    if (teamForm.processing) return;
    teamForm.post('/administration/teams', {
        onSuccess: () => {
            teamForm.reset();
            teamForm.clearErrors();
        },
        onError: () => {
            // Handled via teamForm.errors
        },
    });
}

// -------------------------------------------------------------
// STEP 3: USERS & ROLE ASSIGNMENT
// -------------------------------------------------------------
const userForm = useForm({
    name: '',
    username: '',
    team_id: null as number | null,
    role_ids: [] as number[],
});

// One-time credential transient state (AC3, B-15-2)
const showCredentialModal = ref(false);
const activeTemporaryPassword = ref<string | null>(null);
const activeCredentialUsername = ref<string | null>(null);
const dismissedSecret = ref<string | null>(null);

// Watch flash props for temporary credential
watch(
    () => props.flash,
    (flashData) => {
        if (flashData?.temporary_password) {
            // Idempotent: do not re-reveal if this secret was already dismissed (B-15-2)
            if (flashData.temporary_password === dismissedSecret.value) {
                return;
            }
            activeTemporaryPassword.value = flashData.temporary_password;
            activeCredentialUsername.value = flashData.username || userForm.username || null;
            showCredentialModal.value = true;
        }
    },
    { deep: true, immediate: true },
);

function toggleUserRole(roleId: number): void {
    if (userForm.role_ids.includes(roleId)) {
        userForm.role_ids = userForm.role_ids.filter((id) => id !== roleId);
    } else {
        userForm.role_ids.push(roleId);
    }
}

function submitUser(): void {
    if (userForm.processing) return;
    userForm.post('/administration/users', {
        onSuccess: (page: unknown) => {
            // Check if server response returned flash in page props (R-15-4: flash only, no bare prop)
            const pageProps = (page as { props?: { flash?: { temporary_password?: string; username?: string } } })?.props;
            const tempPass = pageProps?.flash?.temporary_password;
            const uName = pageProps?.flash?.username || userForm.username;

            if (tempPass) {
                // Check if already dismissed previously (B-15-2)
                if (tempPass !== dismissedSecret.value) {
                    activeTemporaryPassword.value = tempPass;
                    activeCredentialUsername.value = uName;
                    showCredentialModal.value = true;
                }
            }

            userForm.reset();
            userForm.clearErrors();
        },
    });
}

function handleDismissCredential(): void {
    // Purge memory immediately on dismiss (AC3, B-15-2)
    dismissedSecret.value = activeTemporaryPassword.value;
    activeTemporaryPassword.value = null;
    activeCredentialUsername.value = null;
    showCredentialModal.value = false;
}

// Ensure credential state is purged on unmount (R-15-2)
onUnmounted(() => {
    activeTemporaryPassword.value = null;
    activeCredentialUsername.value = null;
    dismissedSecret.value = null;
    showCredentialModal.value = false;
});

// -------------------------------------------------------------
// STEP 4: COMPLETE & SUMMARY
// -------------------------------------------------------------
const finishForm = useForm({});

function finalizeSetup(): void {
    if (finishForm.processing) return;
    finishForm.post('/administration/setup/complete', {
        onSuccess: () => {
            router.visit('/dashboard');
        },
    });
}
</script>

<template>
    <div class="min-h-screen bg-background text-foreground flex flex-col">
        <Head title="Initial Setup Wizard" />

        <!-- Header -->
        <header class="border-b border-border bg-card px-6 py-4">
            <div class="max-w-5xl mx-auto flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <Shield class="w-6 h-6" />
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-foreground">NSCMF Initial Setup Wizard</h1>
                        <p class="text-xs text-muted-foreground">Configure initial system requirements</p>
                    </div>
                </div>
                <div class="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    Step {{ currentStep }} of 4
                </div>
            </div>
        </header>

        <!-- Stepper Navigation (Accessible Stepper AC1) -->
        <nav
            data-testid="setup-stepper"
            role="navigation"
            aria-label="Setup progress"
            class="bg-card/50 border-b border-border px-6 py-4"
        >
            <div class="max-w-5xl mx-auto">
                <ol class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <li
                        v-for="step in steps"
                        :key="step.id"
                        data-testid="stepper-step"
                        class="flex items-center gap-3 p-3 rounded-lg transition-colors border"
                        :class="[
                            currentStep === step.id
                                ? 'bg-primary/5 border-primary text-foreground'
                                : currentStep > step.id
                                  ? 'bg-muted/40 border-border text-foreground'
                                  : 'border-transparent text-muted-foreground opacity-60',
                        ]"
                        :aria-current="currentStep === step.id ? 'step' : undefined"
                    >
                        <div
                            class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
                            :class="[
                                currentStep === step.id
                                    ? 'bg-primary text-primary-foreground'
                                    : currentStep > step.id
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-muted text-muted-foreground',
                            ]"
                        >
                            <Check v-if="currentStep > step.id" class="w-4 h-4" />
                            <span v-else>{{ step.id }}</span>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-semibold truncate">{{ step.title }}</p>
                            <p class="text-[11px] text-muted-foreground truncate">{{ step.description }}</p>
                        </div>
                    </li>
                </ol>
            </div>
        </nav>

        <!-- Main Content Area -->
        <main class="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
            <!-- STEP 1: ROLE SETUP -->
            <section
                v-if="currentStep === 1"
                data-testid="step-role-setup"
                class="space-y-6 bg-card border border-border rounded-xl p-6 shadow-xs"
            >
                <div>
                    <h2 class="text-lg font-bold text-foreground">Step 1: Role & Permission Setup</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                        Select whether to apply the standard production role template (Superadmin, Requester, Reviewer, Approver) or configure roles manually.
                    </p>
                </div>

                <!-- Mode Selector -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                        data-testid="role-mode-template"
                        class="relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all"
                        :class="roleMode === 'template' ? 'border-primary bg-primary/5' : 'border-border bg-card'"
                    >
                        <input
                            v-model="roleMode"
                            type="radio"
                            name="role_mode"
                            value="template"
                            class="sr-only"
                        />
                        <span class="font-semibold text-sm">Use Role Template (Recommended)</span>
                        <span class="text-xs text-muted-foreground mt-1">
                            Applies standard default roles with canonical permissions: Superadmin, Requester, Reviewer, Approver.
                        </span>
                    </label>

                    <label
                        data-testid="role-mode-manual"
                        class="relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all"
                        :class="roleMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border bg-card'"
                    >
                        <input
                            v-model="roleMode"
                            type="radio"
                            name="role_mode"
                            value="manual"
                            class="sr-only"
                        />
                        <span class="font-semibold text-sm">Manual Role Configuration</span>
                        <span class="text-xs text-muted-foreground mt-1">
                            Define custom roles and select specific permission grants from the canonical catalog.
                        </span>
                    </label>
                </div>

                <!-- Template Mode Body -->
                <div v-if="roleMode === 'template'" class="space-y-4 pt-2">
                    <div class="rounded-lg bg-muted/40 border border-border p-4 text-xs space-y-2">
                        <p class="font-medium text-foreground">Standard Template Baseline:</p>
                        <ul class="list-disc list-inside text-muted-foreground space-y-1">
                            <li><strong class="text-foreground">Superadmin</strong>: Full operational and administration management</li>
                            <li><strong class="text-foreground">Requester</strong>: Create, edit, save draft, submit, and request revision</li>
                            <li><strong class="text-foreground">Reviewer</strong>: Review, recommend revision, or approve draft review</li>
                            <li><strong class="text-foreground">Approver</strong>: Formal approval authorization and issuance</li>
                        </ul>
                    </div>

                    <button
                        type="button"
                        data-testid="btn-apply-template"
                        class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        :disabled="templateForm.processing"
                        @click="applyRoleTemplate"
                    >
                        {{ templateForm.processing ? 'Applying Template...' : 'Apply Standard Role Template' }}
                    </button>
                </div>

                <!-- Manual Mode Body -->
                <div v-else class="space-y-4 pt-2">
                    <form @submit.prevent="submitManualRole" class="space-y-4">
                        <FormField id="manual-role-name" label="Role Name" :error="manualRoleForm.errors.name" required>
                            <template #default="{ id: fieldId }">
                                <input
                                    :id="fieldId"
                                    v-model="manualRoleForm.name"
                                    data-testid="input-manual-role-name"
                                    type="text"
                                    class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                                    placeholder="e.g. Operations Coordinator"
                                />
                            </template>
                        </FormField>

                        <div class="space-y-2">
                            <label class="text-sm font-medium text-foreground">Permissions</label>
                            <div class="space-y-4 border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                                <div v-for="(perms, group) in groupedPermissions" :key="group" class="space-y-2">
                                    <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{{ group }}</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <label
                                            v-for="perm in perms"
                                            :key="perm.name"
                                            class="flex items-start gap-2 text-xs cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                :checked="manualRoleForm.permissions.includes(perm.name)"
                                                class="rounded border-input text-primary mt-0.5"
                                                @change="toggleManualPermission(perm.name)"
                                            />
                                            <div>
                                                <span class="font-medium text-foreground">{{ perm.name }}</span>
                                                <p v-if="perm.description" class="text-muted-foreground text-[11px]">{{ perm.description }}</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            data-testid="btn-create-manual-role"
                            class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                            :disabled="manualRoleForm.processing || !manualRoleForm.name"
                            @click="submitManualRole"
                        >
                            {{ manualRoleForm.processing ? 'Creating...' : 'Create Role' }}
                        </button>
                    </form>
                </div>

                <!-- Configured Roles List -->
                <div v-if="roles && roles.length > 0" class="pt-4 border-t border-border">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configured Roles ({{ roles.length }})</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        <div
                            v-for="role in roles"
                            :key="role.id"
                            data-testid="configured-role-badge"
                            class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs"
                        >
                            <span class="font-medium text-foreground">{{ role.name }}</span>
                            <span class="text-[11px] text-muted-foreground">{{ role.permissions?.length || 0 }} perms</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- STEP 2: TEAM SETUP -->
            <section
                v-if="currentStep === 2"
                data-testid="step-team-setup"
                class="space-y-6 bg-card border border-border rounded-xl p-6 shadow-xs"
            >
                <div>
                    <h2 class="text-lg font-bold text-foreground">Step 2: Organizational Team Setup</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                        Teams are organizational groups for operational grouping. They do not define permission or approval scopes.
                    </p>
                </div>

                <form @submit.prevent="submitTeam" class="space-y-4 max-w-lg">
                    <FormField id="team-name" label="Team Name" :error="teamForm.errors.name" required>
                        <template #default="{ id: fieldId }">
                            <input
                                :id="fieldId"
                                v-model="teamForm.name"
                                data-testid="input-team-name"
                                type="text"
                                class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                                placeholder="e.g. Core Network Operations"
                                :disabled="teamForm.processing"
                            />
                        </template>
                    </FormField>

                    <button
                        type="submit"
                        data-testid="btn-create-team"
                        class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        :disabled="teamForm.processing || !teamForm.name"
                        @click="submitTeam"
                    >
                        {{ teamForm.processing ? 'Creating Team...' : 'Create Team' }}
                    </button>
                </form>

                <!-- Teams List -->
                <div v-if="teams && teams.length > 0" class="pt-4 border-t border-border">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configured Teams ({{ teams.length }})</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <div
                            v-for="team in teams"
                            :key="team.id"
                            data-testid="configured-team-badge"
                            class="p-2.5 rounded-lg border border-border bg-muted/20 text-xs font-medium text-foreground"
                        >
                            {{ team.name }}
                        </div>
                    </div>
                </div>
            </section>

            <!-- STEP 3: USERS & ROLE ASSIGNMENT -->
            <section
                v-if="currentStep === 3"
                data-testid="step-users-setup"
                class="space-y-6 bg-card border border-border rounded-xl p-6 shadow-xs"
            >
                <div>
                    <h2 class="text-lg font-bold text-foreground">Step 3: Users & Role Assignment</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                        Create normal users, assign them to an organizational Team, and assign operational Roles.
                    </p>
                </div>

                <form @submit.prevent="submitUser" class="space-y-4 max-w-xl">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField id="user-name" label="Full Name" :error="userForm.errors.name" required>
                            <template #default="{ id: fieldId }">
                                <input
                                    :id="fieldId"
                                    v-model="userForm.name"
                                    data-testid="input-user-name"
                                    type="text"
                                    class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                                    placeholder="e.g. John Doe"
                                />
                            </template>
                        </FormField>

                        <FormField id="user-username" label="Username" :error="userForm.errors.username" required>
                            <template #default="{ id: fieldId }">
                                <input
                                    :id="fieldId"
                                    v-model="userForm.username"
                                    data-testid="input-user-username"
                                    type="text"
                                    class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                                    placeholder="e.g. john.doe"
                                />
                            </template>
                        </FormField>
                    </div>

                    <FormField id="user-team" label="Team Assignment" :error="userForm.errors.team_id" required>
                        <template #default="{ id: fieldId }">
                            <select
                                :id="fieldId"
                                v-model="userForm.team_id"
                                data-testid="select-user-team"
                                class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                            >
                                <option :value="null" disabled>Select an organizational Team</option>
                                <option v-for="team in teams" :key="team.id" :value="team.id">
                                    {{ team.name }}
                                </option>
                            </select>
                        </template>
                    </FormField>

                    <div class="space-y-2">
                        <label class="text-sm font-medium text-foreground">Assign Roles</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-lg p-3">
                            <label
                                v-for="role in roles"
                                :key="role.id"
                                class="flex items-center gap-2 text-xs cursor-pointer p-1"
                            >
                                <input
                                    type="checkbox"
                                    :data-testid="`checkbox-role-${role.id}`"
                                    :checked="userForm.role_ids.includes(role.id)"
                                    class="rounded border-input text-primary"
                                    @change="toggleUserRole(role.id)"
                                />
                                <span class="font-medium text-foreground">{{ role.name }}</span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        data-testid="btn-create-user"
                        class="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        :disabled="userForm.processing || !userForm.name || !userForm.username || !userForm.team_id || userForm.role_ids.length === 0"
                        @click="submitUser"
                    >
                        {{ userForm.processing ? 'Creating User...' : 'Create User & Assign Roles' }}
                    </button>
                </form>

                <!-- Configured Users List -->
                <div v-if="users && users.length > 0" class="pt-4 border-t border-border">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configured Users ({{ users.length }})</h3>
                    <div class="space-y-2">
                        <div
                            v-for="user in users"
                            :key="user.id"
                            data-testid="configured-user-card"
                            class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs"
                        >
                            <div>
                                <span class="font-medium text-foreground">{{ user.name }}</span>
                                <span class="text-muted-foreground ml-2">(@{{ user.username }})</span>
                                <span v-if="user.team_name" class="ml-2 px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground">
                                    {{ user.team_name }}
                                </span>
                                <span v-else-if="user.is_protected_superadmin" class="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-medium">
                                    Protected Superadmin (No Team)
                                </span>
                            </div>
                            <div class="flex gap-1">
                                <span
                                    v-for="r in user.roles"
                                    :key="r.id"
                                    class="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px]"
                                >
                                    {{ r.name }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- STEP 4: COMPLETE -->
            <section
                v-if="currentStep === 4"
                data-testid="step-complete"
                class="space-y-6 bg-card border border-border rounded-xl p-6 shadow-xs"
            >
                <div class="flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 class="w-8 h-8" />
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-foreground">
                            {{ readiness.setup_completed ? 'Setup Completed & Verified' : 'Setup Summary & Readiness' }}
                        </h2>
                        <p class="text-sm text-muted-foreground mt-1">
                            {{
                                readiness.setup_completed
                                    ? 'Baseline organizational setup is ready. Review the summary below before launching into the operational dashboard.'
                                    : 'Review the setup progress and system readiness below before completing setup.'
                            }}
                        </p>
                    </div>
                </div>

                <!-- System Readiness Card -->
                <div class="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Readiness</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border text-xs">
                            <Check v-if="readiness.roles_configured" data-testid="readiness-roles-check" class="w-4 h-4 text-emerald-500" />
                            <ShieldAlert v-else class="w-4 h-4 text-amber-500" />
                            <div>
                                <p class="font-medium text-foreground">Roles & Permissions</p>
                                <p class="text-[11px] text-muted-foreground">{{ roles.length }} configured</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border text-xs">
                            <Check v-if="readiness.teams_configured" data-testid="readiness-teams-check" class="w-4 h-4 text-emerald-500" />
                            <ShieldAlert v-else class="w-4 h-4 text-amber-500" />
                            <div>
                                <p class="font-medium text-foreground">Teams</p>
                                <p class="text-[11px] text-muted-foreground">{{ teams.length }} configured</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border text-xs">
                            <Check v-if="readiness.users_configured" data-testid="readiness-users-check" class="w-4 h-4 text-emerald-500" />
                            <ShieldAlert v-else class="w-4 h-4 text-amber-500" />
                            <div>
                                <p class="font-medium text-foreground">Operational Users</p>
                                <p class="text-[11px] text-muted-foreground">{{ users.length }} configured</p>
                            </div>
                        </div>
                        <div
                            data-testid="signing-readiness-status"
                            class="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border text-xs"
                        >
                            <ShieldCheck v-if="readiness.signing_ready" class="w-4 h-4 text-emerald-500" />
                            <ShieldAlert v-else class="w-4 h-4 text-amber-500" />
                            <div>
                                <p class="font-medium text-foreground">Signing Status</p>
                                <p class="text-[11px] text-muted-foreground">
                                    {{ readiness.signing_ready ? 'Siap (Production Ready)' : 'Belum Terkonfigurasi' }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Setup Summary (AC3: Safe summary with NO credentials) -->
                <div class="rounded-xl border border-border bg-card p-4 space-y-4">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setup Summary</h3>
                    
                    <div class="space-y-2">
                        <p class="text-xs font-medium text-muted-foreground">Configured Users:</p>
                        <div class="divide-y divide-border border border-border rounded-lg overflow-hidden">
                            <div
                                v-for="user in users"
                                :key="user.id"
                                class="p-3 text-xs flex items-center justify-between bg-muted/10"
                            >
                                <div>
                                    <span class="font-medium text-foreground">{{ user.name }}</span>
                                    <span class="text-muted-foreground ml-1.5 font-mono">({{ user.username }})</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-muted-foreground">
                                        {{ user.team_name || (user.is_protected_superadmin ? 'Superadmin (No Team)' : 'Unassigned') }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-2">
                    <button
                        type="button"
                        data-testid="btn-finalize-setup"
                        class="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                        :disabled="finishForm.processing"
                        @click="finalizeSetup"
                    >
                        {{ finishForm.processing ? 'Finalizing Setup...' : 'Enter Operational Dashboard' }}
                    </button>
                </div>
            </section>

            <!-- Navigation Controls -->
            <div class="flex items-center justify-between pt-4 border-t border-border">
                <button
                    type="button"
                    data-testid="btn-prev-step"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="currentStep === 1"
                    @click="prevStep"
                >
                    <ArrowLeft class="w-4 h-4" />
                    Previous
                </button>

                <button
                    v-if="currentStep < 4"
                    type="button"
                    data-testid="btn-next-step"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!isStepReadyToAdvance"
                    @click="nextStep"
                >
                    Next Step
                    <ArrowRight class="w-4 h-4" />
                </button>
            </div>
        </main>

        <!-- One Time Credential Dialog (AC3) -->
        <OneTimeCredential
            :open="showCredentialModal"
            :temporary-password="activeTemporaryPassword"
            :username="activeCredentialUsername"
            @dismiss="handleDismissCredential"
        />
    </div>
</template>
