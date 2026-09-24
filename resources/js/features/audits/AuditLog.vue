<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed } from 'vue';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
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
</script>

<template>
    <div class="grid gap-4">
        <Card>
            <CardContent>
                <form class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Audit filters" @submit.prevent>
                    <Field>
                        <FieldLabel for="audit-filter-event">Event</FieldLabel>
                        <NativeSelect
                            id="audit-filter-event"
                            class="w-full"
                            data-testid="audit-filter-event"
                            :model-value="query.event_type ?? ''"
                            @change="filter('event_type', $event)"
                        >
                            <option value="">All events</option>
                            <option v-for="event in events" :key="event" :value="event">{{ label(event) }}</option>
                        </NativeSelect>
                    </Field>
                    <Field v-if="kind === 'security'">
                        <FieldLabel for="audit-filter-outcome">Outcome</FieldLabel>
                        <NativeSelect
                            id="audit-filter-outcome"
                            class="w-full"
                            data-testid="audit-filter-outcome"
                            :model-value="query.outcome ?? ''"
                            @change="filter('outcome', $event)"
                        >
                            <option value="">All outcomes</option>
                            <option v-for="outcome in OUTCOMES" :key="outcome" :value="outcome">
                                {{ label(outcome) }}
                            </option>
                        </NativeSelect>
                    </Field>
                    <Field>
                        <FieldLabel for="audit-filter-from">From</FieldLabel>
                        <Input
                            id="audit-filter-from"
                            type="date"
                            data-testid="audit-filter-from"
                            :model-value="query.occurred_from ?? ''"
                            @change="filter('occurred_from', $event)"
                        />
                    </Field>
                    <Field>
                        <FieldLabel for="audit-filter-to">To</FieldLabel>
                        <Input
                            id="audit-filter-to"
                            type="date"
                            data-testid="audit-filter-to"
                            :model-value="query.occurred_to ?? ''"
                            @change="filter('occurred_to', $event)"
                        />
                    </Field>
                </form>
            </CardContent>
        </Card>

        <Empty v-if="rows.length === 0" class="border p-8">
            <EmptyDescription>No audit events match these filters.</EmptyDescription>
        </Empty>
        <Card v-else class="gap-0 py-0">
            <ul class="divide-y">
                <li v-for="row in rows" :key="row.id">
                    <Item size="sm" class="rounded-none">
                        <ItemContent>
                            <ItemTitle>
                                {{ row.event }}
                                <Badge v-if="row.outcome" :variant="row.outcome === 'SUCCESS' ? 'success' : 'warning'">
                                    {{ label(row.outcome) }}
                                </Badge>
                            </ItemTitle>
                            <div class="grid gap-0.5 text-xs">
                                <p class="text-muted-foreground">{{ row.at }} · {{ row.actor }}</p>
                                <p v-if="row.target">Target user: {{ row.target }}</p>
                                <p v-if="row.subject">Username entered: {{ row.subject }}</p>
                                <p v-if="row.ip">IP address: {{ row.ip }}</p>
                                <p v-if="row.record">
                                    Record:
                                    <Link
                                        :href="`/nscmf/${row.record.id}`"
                                        class="text-primary underline-offset-4 hover:underline"
                                    >
                                        {{ row.record.request_no ?? `#${row.record.id}` }}
                                    </Link>
                                </p>
                            </div>
                        </ItemContent>
                    </Item>
                </li>
            </ul>
        </Card>

        <nav aria-label="Audit pages" class="flex items-center justify-between gap-3">
            <Button
                type="button"
                variant="outline"
                data-testid="audit-previous"
                :disabled="meta.current_page <= 1"
                @click="visit({ page: meta.current_page - 1 })"
                >Previous</Button
            >
            <span class="text-muted-foreground">
                Page {{ meta.current_page }} of {{ Math.max(1, meta.last_page) }} · {{ meta.total }} events
            </span>
            <Button
                type="button"
                variant="outline"
                data-testid="audit-next"
                :disabled="meta.current_page >= meta.last_page"
                @click="visit({ page: meta.current_page + 1 })"
                >Next</Button
            >
        </nav>
    </div>
</template>
