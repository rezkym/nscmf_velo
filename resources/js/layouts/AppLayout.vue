<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, ref } from 'vue';

import { usePermissions } from '@/composables/usePermissions';

const props = withDefaults(
    defineProps<{
        title?: string;
    }>(),
    {
        title: 'NSCMF',
    },
);

const isSidebarOpen = ref(true);

function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value;
}

const { user, can, canAny } = usePermissions();

const mustChangePassword = computed(() => Boolean(user.value?.must_change_password));

// Navigation follows effective permissions only, never role names or Team.
const navItems = computed(() =>
    [
        { label: 'Dashboard', href: '/dashboard', visible: true },
        { label: 'Create NSCMF', href: '/nscmf/create', visible: can('nscmf.create') },
        { label: 'Review', href: '/review', visible: can('nscmf.review') },
        { label: 'Approval', href: '/approval', visible: can('nscmf.approve') },
        { label: 'History', href: '/history', visible: can('nscmf.view.history') },
        {
            label: 'Administration',
            href: '/administration',
            visible: canAny([
                'users.view',
                'roles.view',
                'teams.view',
                'system.settings.manage',
                'audit.access.view',
                'audit.security.view',
            ]),
        },
    ].filter((item) => item.visible),
);
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

    <!-- Normal Authenticated Shell -->
    <div v-else class="flex min-h-screen flex-col bg-background text-foreground">
        <!-- Accessibility Skip Link -->
        <a
            href="#main-content"
            class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
            Skip to main content
        </a>

        <!-- Top Contextual Header -->
        <header
            class="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6"
        >
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    data-testid="sidebar-toggle"
                    :aria-expanded="isSidebarOpen ? 'true' : 'false'"
                    aria-controls="sidebar-navigation"
                    aria-label="Toggle navigation menu"
                    class="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    @click="toggleSidebar"
                >
                    <span class="sr-only">Toggle sidebar</span>
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
                <div class="flex items-baseline gap-2">
                    <span class="font-bold tracking-tight text-foreground">NSCMF</span>
                    <span
                        v-if="props.title && props.title !== 'NSCMF'"
                        class="text-sm font-medium text-muted-foreground"
                    >
                        / {{ props.title }}
                    </span>
                </div>
            </div>

            <!-- Header Right: User info (Team shown as informational metadata only, not authorization) -->
            <div v-if="user" class="flex items-center gap-3 text-sm">
                <div class="text-right">
                    <div class="font-medium text-foreground">{{ user.name }}</div>
                    <div v-if="user.team" class="text-xs text-muted-foreground">
                        {{ user.team.name }}
                    </div>
                </div>
            </div>
        </header>

        <div class="flex flex-1">
            <!-- Collapsible Sidebar -->
            <aside
                v-show="isSidebarOpen"
                id="sidebar-navigation"
                data-testid="sidebar"
                class="w-64 flex-shrink-0 border-r border-border bg-card p-4 transition-all"
                aria-label="Main Navigation"
            >
                <nav class="space-y-1" aria-label="Sidebar Menu">
                    <Link
                        v-for="item in navItems"
                        :key="item.href"
                        :href="item.href"
                        class="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {{ item.label }}
                    </Link>
                </nav>
            </aside>

            <!-- Main Content Landmark -->
            <main id="main-content" class="flex-1 p-6 focus:outline-none" tabindex="-1">
                <slot />
            </main>
        </div>
    </div>
</template>
