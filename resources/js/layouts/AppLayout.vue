<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    ClipboardCheck,
    FilePlus2,
    History,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    ScrollText,
    Settings2,
    ShieldAlert,
    ShieldCheck,
    Stamp,
    Users,
    UsersRound,
} from '@lucide/vue';
import { computed, ref, type Component } from 'vue';

import BrandMark from '@/components/BrandMark.vue';
import { useFocusTrap } from '@/composables/useFocusTrap';
import { usePermissions } from '@/composables/usePermissions';
import { cn } from '@/lib/utils';

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

// Below the desktop breakpoint the sidebar is a panel over the page (design/plan.md §3).
const isMenuOpen = ref(false);
const sidebar = ref<HTMLElement | null>(null);

function closeMenu(): void {
    isMenuOpen.value = false;
}

useFocusTrap(sidebar, () => isMenuOpen.value, { onEscape: closeMenu });

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

    <div v-else class="min-h-screen bg-background text-foreground lg:flex">
        <a
            href="#main-content"
            class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
            Skip to main content
        </a>

        <div
            v-if="isMenuOpen"
            data-testid="sidebar-backdrop"
            aria-hidden="true"
            class="fixed inset-0 z-40 bg-brand-950/40 transition-opacity duration-300 ease-out starting:opacity-0 lg:hidden"
            @click="closeMenu"
        />

        <aside
            id="sidebar-navigation"
            ref="sidebar"
            data-testid="sidebar"
            aria-label="Main Navigation"
            :class="
                cn(
                    'fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar',
                    // Only the narrow-screen panel slides in; the desktop sidebar never animates on page load.
                    'transition-transform duration-300 ease-drawer max-lg:starting:-translate-x-full',
                    'lg:sticky lg:top-0 lg:z-auto lg:flex lg:h-screen lg:shrink-0',
                    isMenuOpen ? 'flex' : 'hidden',
                )
            "
        >
            <div class="flex h-18 items-center gap-3 px-6">
                <BrandMark />
                <div class="leading-tight">
                    <p class="font-semibold tracking-tight text-heading">NSCMF</p>
                    <p class="text-xs text-muted-foreground">Digital Form &amp; Workflow</p>
                </div>
            </div>

            <nav class="flex-1 space-y-6 overflow-y-auto px-4 py-4" aria-label="Sidebar Menu">
                <div v-for="group in navGroups" :key="group.label" class="space-y-1">
                    <p class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {{ group.label }}
                    </p>
                    <Link
                        v-for="item in group.items"
                        :key="item.href"
                        :href="item.href"
                        :aria-current="isCurrent(item.href) ? 'page' : undefined"
                        :class="
                            cn(
                                'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                isCurrent(item.href)
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-4 before:w-1 before:rounded-r-full before:bg-sidebar-primary'
                                    : 'text-sidebar-foreground hover:bg-muted hover:text-heading',
                            )
                        "
                    >
                        <component
                            :is="item.icon"
                            class="size-[18px] shrink-0"
                            :stroke-width="1.75"
                            aria-hidden="true"
                        />
                        {{ item.label }}
                    </Link>
                </div>
            </nav>

            <!-- Team is profile information only, never an access hint (07 §6). -->
            <div v-if="user" class="space-y-2 border-t border-sidebar-border p-4">
                <div class="min-w-0 px-3">
                    <p class="truncate text-sm font-medium text-heading">{{ user.name }}</p>
                    <p v-if="user.team" class="truncate text-xs text-muted-foreground">{{ user.team.name }}</p>
                </div>
                <button
                    type="button"
                    data-testid="btn-logout"
                    class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    @click="signOut"
                >
                    <LogOut class="size-[18px]" :stroke-width="1.75" aria-hidden="true" />
                    Sign out
                </button>
            </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
            <header
                class="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6 lg:px-8"
            >
                <button
                    type="button"
                    data-testid="sidebar-toggle"
                    :aria-expanded="isMenuOpen ? 'true' : 'false'"
                    aria-controls="sidebar-navigation"
                    aria-label="Open navigation menu"
                    class="-ml-1 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-card hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                    @click="isMenuOpen = !isMenuOpen"
                >
                    <Menu class="size-5" :stroke-width="1.75" aria-hidden="true" />
                </button>
                <p class="flex min-w-0 items-baseline gap-2 text-sm">
                    <span class="font-semibold text-heading lg:hidden">NSCMF</span>
                    <span class="text-muted-foreground lg:hidden" aria-hidden="true">/</span>
                    <span class="truncate font-medium text-foreground">{{ props.title }}</span>
                </p>
            </header>

            <main id="main-content" class="min-w-0 flex-1 p-4 focus:outline-none sm:p-6 lg:p-8" tabindex="-1">
                <slot />
            </main>
        </div>
    </div>
</template>
