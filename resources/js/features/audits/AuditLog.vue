<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { formatJakarta } from '@/lib/datetime';

/** The server's echo of the accepted audit query (12 §13, §49–50). */
export interface AuditQuery {
    page: number;
    per_page: number;
    event_type: string | null;
    actor_user_id: number | null;
    occurred_from: string | null;
    occurred_to: string | null;
    outcome: string | null;
}

const ACCESS_EVENTS = [
    'RECORD_VIEWED',
    'ATTACHMENT_VIEWED',
    'ATTACHMENT_DOWNLOADED',
    'EXPORT_REQUESTED',
    'EXPORT_DOWNLOADED',
    'PRIVILEGED_AUDIT_VIEWED',
];
const SECURITY_EVENTS = [
    'LOGIN_SUCCEEDED',
    'LOGIN_FAILED',
    'LOGIN_THROTTLED',
    'LOGIN_ACCOUNT_DISABLED',
    'LOGOUT',
    'SESSION_REVOKED',
    'REAUTH_SUCCEEDED',
    'REAUTH_FAILED',
    'TEMPORARY_PASSWORD_REPLACED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_ENABLED',
    'USER_DISABLED',
    'PASSWORD_RESET',
    'USER_ROLES_CHANGED',
    'USER_TEAM_CHANGED',
    'ROLE_CREATED',
    'ROLE_UPDATED',
    'ROLE_PERMISSIONS_CHANGED',
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_DEACTIVATED',
    'TEAM_REACTIVATED',
    'PROTECTED_ACTION_DENIED',
    'MALWARE_DETECTED',
    'MALWARE_SCAN_FAILED',
    'PDF_SIGNING_FAILED',
    'SIGNING_CERTIFICATE_ACTIVATED',
    'SYSTEM_SETTINGS_UPDATED',
];
const OUTCOMES = ['SUCCESS', 'FAILURE', 'DENIED', 'ERROR'];

interface PersonRef {
    id: number;
    name: string | null;
}

/**
 * One read-only privileged audit stream. Only the fields named here are rendered, so an
 * unexpected server field (a secret included by mistake) never reaches the page (10; 12 §49–50).
 */
const props = defineProps<{
    kind: 'access' | 'security';
    items: Record<string, unknown>[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
    query: AuditQuery;
}>();

const endpoint = computed(() => `/administration/audits/${props.kind}`);
const events = computed(() => (props.kind === 'access' ? ACCESS_EVENTS : SECURITY_EVENTS));

function label(value: string): string {
    return value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase());
}

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const person = (value: unknown): PersonRef | null =>
    typeof value === 'object' && value !== null && 'id' in value ? (value as PersonRef) : null;
const recordRef = (value: unknown) =>
    typeof value === 'object' && value !== null && 'id' in value
        ? (value as { id: number; request_no: string | null })
        : null;

const rows = computed(() =>
    props.items.map((item) => ({
        id: Number(item.id),
        event: label(text(item.event_type) ?? ''),
        outcome: text(item.outcome),
        at: formatJakarta(text(item.occurred_at)),
        actor: person(item.actor)?.name ?? 'System',
        target: person(item.target)?.name ?? null,
        subject: text(item.subject_username),
        ip: text(item.ip_address),
        record: recordRef(item.record),
    })),
);

function visit(patch: Partial<AuditQuery>): void {
    const next = { ...props.query, ...patch };
    const params: Record<string, string | number> = { page: next.page, per_page: next.per_page };
    for (const key of ['event_type', 'actor_user_id', 'occurred_from', 'occurred_to', 'outcome'] as const) {
        const value = next[key];
        if (value !== null && value !== '' && (key !== 'outcome' || props.kind === 'security')) params[key] = value;
    }
    router.get(endpoint.value, params, { preserveState: true, preserveScroll: true });
}

function filter(key: 'event_type' | 'outcome' | 'occurred_from' | 'occurred_to', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    visit({ [key]: value === '' ? null : value, page: 1 });
}

const control =
    'w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring';
</script>

<template>
    <div class="space-y-4">
        <form class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Audit filters" @submit.prevent>
            <label class="space-y-1 text-sm">
                <span class="block text-muted-foreground">Event</span>
                <select
                    data-testid="audit-filter-event"
                    :class="control"
                    :value="query.event_type ?? ''"
                    @change="filter('event_type', $event)"
                >
                    <option value="">All events</option>
                    <option v-for="event in events" :key="event" :value="event">{{ label(event) }}</option>
                </select>
            </label>
            <label v-if="kind === 'security'" class="space-y-1 text-sm">
                <span class="block text-muted-foreground">Outcome</span>
                <select
                    data-testid="audit-filter-outcome"
                    :class="control"
                    :value="query.outcome ?? ''"
                    @change="filter('outcome', $event)"
                >
                    <option value="">All outcomes</option>
                    <option v-for="outcome in OUTCOMES" :key="outcome" :value="outcome">{{ label(outcome) }}</option>
                </select>
            </label>
            <label class="space-y-1 text-sm">
                <span class="block text-muted-foreground">From</span>
                <input
                    type="date"
                    data-testid="audit-filter-from"
                    :class="control"
                    :value="query.occurred_from ?? ''"
                    @change="filter('occurred_from', $event)"
                />
            </label>
            <label class="space-y-1 text-sm">
                <span class="block text-muted-foreground">To</span>
                <input
                    type="date"
                    data-testid="audit-filter-to"
                    :class="control"
                    :value="query.occurred_to ?? ''"
                    @change="filter('occurred_to', $event)"
                />
            </label>
        </form>

        <p v-if="rows.length === 0" class="rounded-lg border border-border p-6 text-sm text-muted-foreground">
            No audit events match these filters.
        </p>
        <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
            <li v-for="row in rows" :key="row.id" class="space-y-1 p-4 text-sm">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ row.event }}</span>
                    <Badge v-if="row.outcome" :variant="row.outcome === 'SUCCESS' ? 'success' : 'warning'">{{
                        label(row.outcome)
                    }}</Badge>
                </div>
                <p class="text-xs text-muted-foreground">{{ row.at }} · {{ row.actor }}</p>
                <p v-if="row.target" class="text-xs">Target user: {{ row.target }}</p>
                <p v-if="row.subject" class="text-xs">Username entered: {{ row.subject }}</p>
                <p v-if="row.ip" class="text-xs">IP address: {{ row.ip }}</p>
                <p v-if="row.record" class="text-xs">
                    Record:
                    <Link :href="`/nscmf/${row.record.id}`" class="text-primary hover:underline">{{
                        row.record.request_no ?? `#${row.record.id}`
                    }}</Link>
                </p>
            </li>
        </ul>

        <nav aria-label="Audit pages" class="flex items-center justify-between gap-3">
            <Button
                variant="secondary"
                data-testid="audit-previous"
                :disabled="meta.current_page <= 1"
                @click="visit({ page: meta.current_page - 1 })"
                >Previous</Button
            >
            <span class="text-sm text-muted-foreground"
                >Page {{ meta.current_page }} of {{ Math.max(1, meta.last_page) }} · {{ meta.total }} events</span
            >
            <Button
                variant="secondary"
                data-testid="audit-next"
                :disabled="meta.current_page >= meta.last_page"
                @click="visit({ page: meta.current_page + 1 })"
                >Next</Button
            >
        </nav>
    </div>
</template>
