<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    ClipboardCheck,
    FilePlus2,
    History,
    LayoutDashboard,
    ListChecks,
    LogOut,
    ScrollText,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    Stamp,
    Users,
    UsersRound,
} from '@lucide/vue';
import { computed, type Component } from 'vue';

import BrandMark from '@/components/BrandMark.vue';
import { Separator } from '@/components/ui/separator';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/composables/usePermissions';

const props = withDefaults(defineProps<{ title?: string }>(), { title: 'NSCMF' });

interface NavItem {
    label: string;
    href: string;
    icon: Component;
    visible: boolean;
}

const page = usePage();
const { user, can } = usePermissions();

const mustChangePassword = computed(() => Boolean(user.value?.must_change_password));

// Navigation follows effective permissions only, never role names or Team.
const workspaceItems = computed<NavItem[]>(() =>
    [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
        { label: 'Create NSCMF', href: '/nscmf/create', icon: FilePlus2, visible: can('nscmf.create') },
        { label: 'Review', href: '/review', icon: ClipboardCheck, visible: can('nscmf.review') },
        { label: 'Approval', href: '/approval', icon: Stamp, visible: can('nscmf.approve') },
        { label: 'History', href: '/history', icon: History, visible: can('nscmf.view.history') },
    ].filter((item) => item.visible),
);

// Administration pages from 12 §114; there is no /administration landing route.
const administrationItems = computed<NavItem[]>(() =>
    [
        { label: 'Users', href: '/administration/users', icon: Users, visible: can('users.view') },
        { label: 'Roles', href: '/administration/roles', icon: ShieldCheck, visible: can('roles.view') },
        { label: 'Teams', href: '/administration/teams', icon: UsersRound, visible: can('teams.view') },
        {
            label: 'Setup',
            href: '/administration/setup',
            icon: ListChecks,
            visible: can('roles.view') && can('teams.view') && can('users.view'),
        },
        {
            label: 'Access Audit',
            href: '/administration/audits/access',
            icon: ScrollText,
            visible: can('audit.access.view'),
        },
        {
            label: 'Security Audit',
            href: '/administration/audits/security',
            icon: ShieldAlert,
            visible: can('audit.security.view'),
        },
        {
            label: 'Technical Logs',
            href: '/administration/settings/technical-logs',
            icon: Settings2,
            // 07 §51: a protected Core Setting, only for the Protected Superadmin.
            visible: can('system.settings.manage') && Boolean(user.value?.is_protected_superadmin),
        },
    ].filter((item) => item.visible),
);

const navGroups = computed(() =>
    [
        { label: 'Workspace', items: workspaceItems.value },
        { label: 'Administration', items: administrationItems.value },
    ].filter((group) => group.items.length > 0),
);

/** The link of the page being shown, including its sub-pages (`/review/12` is under Review). */
function isCurrent(href: string): boolean {
    const path = page.url.split('?')[0] ?? '';
    return path === href || path.startsWith(`${href}/`);
}

/** POST /logout destroys the server session (12 §77); the server redirects to the login page. */
function signOut(): void {
    router.post('/logout');
}
</script>

<template>
    <Head :title="props.title" />

    <!-- Gate: If user must change password, do not show normal authenticated shell -->
    <div
        v-if="mustChangePassword"
        class="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground"
    >
        <slot />
    </div>

    <!-- On narrow screens the shadcn Sidebar becomes a panel over the page (design/plan.md §3). -->
    <SidebarProvider v-else>
        <a
            href="#main-content"
            class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
            Skip to main content
        </a>

        <Sidebar>
            <SidebarHeader>
                <div class="flex items-center gap-2.5 px-2 py-1.5">
                    <BrandMark />
                    <div class="grid leading-tight">
                        <span class="font-semibold text-heading">NSCMF</span>
                        <span class="text-xs text-muted-foreground">Digital Form &amp; Workflow</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <nav aria-label="Sidebar Menu">
                    <SidebarGroup v-for="group in navGroups" :key="group.label">
                        <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem v-for="item in group.items" :key="item.href">
                                <SidebarMenuButton as-child :is-active="isCurrent(item.href)">
                                    <Link :href="item.href" :aria-current="isCurrent(item.href) ? 'page' : undefined">
                                        <component :is="item.icon" aria-hidden="true" />
                                        <span>{{ item.label }}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </nav>
            </SidebarContent>

            <!-- Team is profile information only, never an access hint (07 §6). -->
            <SidebarFooter v-if="user">
                <div data-testid="sidebar-user" class="grid px-2 py-1.5 leading-tight">
                    <span class="truncate text-sm font-medium text-heading">{{ user.name }}</span>
                    <span v-if="user.team" class="truncate text-xs text-muted-foreground">{{ user.team.name }}</span>
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton type="button" data-testid="btn-logout" @click="signOut">
                            <LogOut aria-hidden="true" />
                            <span>Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>

        <SidebarInset id="main-content" tabindex="-1" class="min-w-0 focus:outline-none">
            <header
                class="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6"
            >
                <SidebarTrigger data-testid="sidebar-toggle" class="-ml-1" />
                <Separator orientation="vertical" class="mr-1 data-[orientation=vertical]:h-4" />
                <p class="truncate text-sm font-medium text-heading">{{ props.title }}</p>
            </header>

            <div class="flex-1 p-4 sm:p-6 lg:p-8">
                <slot />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>
