<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

import AppLayout from '@/layouts/AppLayout.vue';

export interface CardCountState {
    count?: number | null;
    loading?: boolean;
    error?: string | null;
}

export interface SummaryItem {
    id: number;
    request_number: string;
    title: string;
    team?: string | null;
    updated_at?: string | null;
}

export interface DashboardCounts {
    drafts?: CardCountState;
    revisions?: CardCountState;
    reviews?: CardCountState;
    approvals?: CardCountState;
}

export interface DashboardItems {
    drafts?: SummaryItem[];
    revisions?: SummaryItem[];
    reviews?: SummaryItem[];
    approvals?: SummaryItem[];
}

interface SharedAuthProps {
    auth?: {
        user?: {
            id: number;
            username: string;
            name: string;
            team_id?: number | null;
            team?: { id: number; name: string } | null;
            must_change_password?: boolean;
        } | null;
        permissions?: string[];
        roles?: string[];
    };
    [key: string]: unknown;
}

const props = withDefaults(
    defineProps<{
        counts?: DashboardCounts;
        items?: DashboardItems;
    }>(),
    {
        counts: () => ({}),
        items: () => ({}),
    },
);

const page = usePage<SharedAuthProps>();

const user = computed(() => page.props.auth?.user);
const permissions = computed<string[]>(() => page.props.auth?.permissions ?? []);

function hasPermission(perm: string): boolean {
    return permissions.value.includes(perm);
}

// Permission-centric cards visibility according to 07 §17 and AC1
// Requester own draft/revision; multi-role review+approval; permissions missing hide relevant action.
const canViewDrafts = computed(() => hasPermission('nscmf.create') || hasPermission('nscmf.draft.edit'));
const canViewRevisions = computed(() => hasPermission('nscmf.draft.edit') || hasPermission('nscmf.submit'));
const canViewReviews = computed(() => hasPermission('nscmf.review'));
const canViewApprovals = computed(() => hasPermission('nscmf.approve'));
const canQuickCreate = computed(() => hasPermission('nscmf.create'));

const hasActiveTeam = computed(() => Boolean(user.value?.team));

function retryCount() {
    router.reload({ only: ['counts'] });
}
</script>

<template>
    <AppLayout title="Dashboard">
        <Head title="Dashboard" />

        <div class="space-y-6">
            <!-- Header & Quick Actions -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
                    <p class="text-sm text-neutral-500">Operational attention overview and workflow queues.</p>
                </div>

                <div class="flex items-center gap-3">
                    <Link
                        v-if="canQuickCreate && hasActiveTeam"
                        href="/nscmf/create"
                        data-testid="quick-create-link"
                        class="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                    >
                        Create NSCMF
                    </Link>

                    <div
                        v-else-if="canQuickCreate && !hasActiveTeam"
                        data-testid="team-prerequisite-notice"
                        class="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 border border-amber-200"
                    >
                        Active Team prerequisite is required before creating NSCMF.
                    </div>

                    <Link
                        href="/history"
                        data-testid="quick-history-link"
                        class="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                    >
                        History
                    </Link>
                </div>
            </div>

            <!-- Attention Cards Grid -->
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <!-- Drafts Card -->
                <div
                    v-if="canViewDrafts"
                    data-testid="card-drafts"
                    class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-neutral-600">My Drafts</h2>
                        <Link
                            href="/dashboard"
                            data-testid="view-canonical-link"
                            class="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                        >
                            View
                        </Link>
                    </div>

                    <div class="min-h-[48px] flex items-center">
                        <div
                            v-if="props.counts?.drafts?.loading"
                            data-testid="loading-indicator"
                            class="flex items-center space-x-2 text-sm text-neutral-400"
                        >
                            <span class="animate-pulse">Loading counts…</span>
                        </div>
                        <div v-else-if="props.counts?.drafts?.error" class="space-y-1 w-full">
                            <p data-testid="error-message" class="text-xs text-rose-600">
                                {{ props.counts.drafts.error }}
                            </p>
                            <button
                                type="button"
                                data-testid="retry-button"
                                @click="retryCount"
                                class="text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
                            >
                                Retry
                            </button>
                        </div>
                        <div
                            v-else
                            data-testid="count-value"
                            class="text-3xl font-bold tracking-tight text-neutral-900"
                        >
                            {{ props.counts?.drafts?.count ?? 0 }}
                        </div>
                    </div>

                    <!-- Short List -->
                    <div
                        v-if="props.items?.drafts && props.items.drafts.length > 0"
                        data-testid="drafts-short-list"
                        class="border-t border-neutral-100 pt-3 space-y-2"
                    >
                        <div
                            v-for="item in props.items.drafts"
                            :key="item.id"
                            class="text-xs text-neutral-700 flex justify-between items-center"
                        >
                            <span class="font-medium truncate">{{ item.request_number }}</span>
                            <span class="text-neutral-400 text-[11px]">{{ item.title }}</span>
                        </div>
                    </div>
                </div>

                <!-- Revision Required Card -->
                <div
                    v-if="canViewRevisions"
                    data-testid="card-revisions"
                    class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-neutral-600">Revision Required</h2>
                        <Link
                            href="/dashboard"
                            data-testid="view-canonical-link"
                            class="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                        >
                            View
                        </Link>
                    </div>

                    <div class="min-h-[48px] flex items-center">
                        <div
                            v-if="props.counts?.revisions?.loading"
                            data-testid="loading-indicator"
                            class="flex items-center space-x-2 text-sm text-neutral-400"
                        >
                            <span class="animate-pulse">Loading counts…</span>
                        </div>
                        <div v-else-if="props.counts?.revisions?.error" class="space-y-1 w-full">
                            <p data-testid="error-message" class="text-xs text-rose-600">
                                {{ props.counts.revisions.error }}
                            </p>
                            <button
                                type="button"
                                data-testid="retry-button"
                                @click="retryCount"
                                class="text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
                            >
                                Retry
                            </button>
                        </div>
                        <div
                            v-else
                            data-testid="count-value"
                            class="text-3xl font-bold tracking-tight text-neutral-900"
                        >
                            {{ props.counts?.revisions?.count ?? 0 }}
                        </div>
                    </div>

                    <!-- Short List -->
                    <div
                        v-if="props.items?.revisions && props.items.revisions.length > 0"
                        data-testid="revisions-short-list"
                        class="border-t border-neutral-100 pt-3 space-y-2"
                    >
                        <div
                            v-for="item in props.items.revisions"
                            :key="item.id"
                            class="text-xs text-neutral-700 flex justify-between items-center"
                        >
                            <span class="font-medium truncate">{{ item.request_number }}</span>
                            <span class="text-neutral-400 text-[11px]">{{ item.title }}</span>
                        </div>
                    </div>
                </div>

                <!-- Review Queue Card -->
                <div
                    v-if="canViewReviews"
                    data-testid="card-reviews"
                    class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-neutral-600">Pending Review</h2>
                        <Link
                            href="/review"
                            data-testid="view-canonical-link"
                            class="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                        >
                            View
                        </Link>
                    </div>

                    <div class="min-h-[48px] flex items-center">
                        <div
                            v-if="props.counts?.reviews?.loading"
                            data-testid="loading-indicator"
                            class="flex items-center space-x-2 text-sm text-neutral-400"
                        >
                            <span class="animate-pulse">Loading counts…</span>
                        </div>
                        <div v-else-if="props.counts?.reviews?.error" class="space-y-1 w-full">
                            <p data-testid="error-message" class="text-xs text-rose-600">
                                {{ props.counts.reviews.error }}
                            </p>
                            <button
                                type="button"
                                data-testid="retry-button"
                                @click="retryCount"
                                class="text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
                            >
                                Retry
                            </button>
                        </div>
                        <div
                            v-else
                            data-testid="count-value"
                            class="text-3xl font-bold tracking-tight text-neutral-900"
                        >
                            {{ props.counts?.reviews?.count ?? 0 }}
                        </div>
                    </div>

                    <!-- Short List with Informational Team field -->
                    <div
                        v-if="props.items?.reviews && props.items.reviews.length > 0"
                        data-testid="reviews-short-list"
                        class="border-t border-neutral-100 pt-3 space-y-2"
                    >
                        <div
                            v-for="item in props.items.reviews"
                            :key="item.id"
                            class="text-xs text-neutral-700 flex justify-between items-center"
                        >
                            <div class="truncate">
                                <span class="font-medium mr-1">{{ item.request_number }}</span>
                                <span
                                    v-if="item.team"
                                    class="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded"
                                >
                                    {{ item.team }}
                                </span>
                            </div>
                            <span class="text-neutral-400 text-[11px] truncate max-w-[120px]">{{ item.title }}</span>
                        </div>
                    </div>
                </div>

                <!-- Approval Queue Card -->
                <div
                    v-if="canViewApprovals"
                    data-testid="card-approvals"
                    class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center justify-between">
                        <h2 class="text-sm font-medium text-neutral-600">Pending Approval</h2>
                        <Link
                            href="/approval"
                            data-testid="view-canonical-link"
                            class="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                        >
                            View
                        </Link>
                    </div>

                    <div class="min-h-[48px] flex items-center">
                        <div
                            v-if="props.counts?.approvals?.loading"
                            data-testid="loading-indicator"
                            class="flex items-center space-x-2 text-sm text-neutral-400"
                        >
                            <span class="animate-pulse">Loading counts…</span>
                        </div>
                        <div v-else-if="props.counts?.approvals?.error" class="space-y-1 w-full">
                            <p data-testid="error-message" class="text-xs text-rose-600">
                                {{ props.counts.approvals.error }}
                            </p>
                            <button
                                type="button"
                                data-testid="retry-button"
                                @click="retryCount"
                                class="text-xs font-medium text-neutral-700 underline hover:text-neutral-900"
                            >
                                Retry
                            </button>
                        </div>
                        <div
                            v-else
                            data-testid="count-value"
                            class="text-3xl font-bold tracking-tight text-neutral-900"
                        >
                            {{ props.counts?.approvals?.count ?? 0 }}
                        </div>
                    </div>

                    <!-- Short List with Informational Team field -->
                    <div
                        v-if="props.items?.approvals && props.items.approvals.length > 0"
                        data-testid="approvals-short-list"
                        class="space-y-2 border-t border-neutral-100 pt-3"
                    >
                        <div
                            v-for="item in props.items.approvals"
                            :key="item.id"
                            class="flex items-center justify-between text-xs text-neutral-700"
                        >
                            <div class="truncate">
                                <span class="mr-1 font-medium">{{ item.request_number }}</span>
                                <span
                                    v-if="item.team"
                                    data-testid="approval-item-team"
                                    class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500"
                                >
                                    {{ item.team }}
                                </span>
                            </div>
                            <span class="max-w-[120px] truncate text-[11px] text-neutral-400">{{ item.title }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
