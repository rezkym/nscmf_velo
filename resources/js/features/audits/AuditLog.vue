<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

import DatePicker from '@/components/DatePicker.vue';
import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { useTableVisit } from '@/composables/useTableVisit';
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

const events = computed(() => (props.kind === 'access' ? ACCESS_EVENTS : SECURITY_EVENTS));
const COMMON_COLUMNS: ColumnDef[] = [
    { key: 'at', label: 'Time' },
    { key: 'event', label: 'Event' },
    { key: 'actor', label: 'Actor' },
];
const columns = computed<ColumnDef[]>(() =>
    props.kind === 'access'
        ? [...COMMON_COLUMNS, { key: 'record', label: 'Record' }]
        : [
              ...COMMON_COLUMNS,
              { key: 'outcome', label: 'Outcome' },
              { key: 'target', label: 'Target user' },
              { key: 'subject', label: 'Username entered' },
              { key: 'ip', label: 'IP address' },
          ],
);

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

const { loading, visit: get } = useTableVisit(`/administration/audits/${props.kind}`);

/** Only the allowlisted filters are sent, and the outcome only to the security stream (12 §49–50). */
function visit(patch: Partial<AuditQuery>): void {
    const next = { ...props.query, ...patch };
    get({
        page: next.page,
        per_page: next.per_page,
        event_type: next.event_type,
        actor_user_id: next.actor_user_id,
        occurred_from: next.occurred_from,
        occurred_to: next.occurred_to,
        outcome: props.kind === 'security' ? next.outcome : null,
    });
}

const tableQuery = computed<TableQuery>(() => ({ page: props.query.page, per_page: props.query.per_page }));
function onTableQuery(table: TableQuery): void {
    visit({ page: table.page, per_page: table.per_page });
}
const row = (item: unknown) => item as (typeof rows.value)[number];

function filter(key: 'event_type' | 'outcome', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    visit({ [key]: value === '' ? null : value, page: 1 });
}
</script>

<template>
    <ResourceTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :query="tableQuery"
        :meta="meta"
        :searchable="false"
        empty-text="No audit events match these filters."
        :caption="kind === 'access' ? 'Access audit events' : 'Security audit events'"
        @update:query="onTableQuery"
    >
        <template #filters>
            <form class="flex flex-wrap items-end gap-3" aria-label="Audit filters" @submit.prevent>
                <Field class="w-full sm:w-56">
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
                <Field v-if="kind === 'security'" class="w-full sm:w-40">
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
                <Field class="w-full sm:w-44">
                    <FieldLabel for="audit-filter-from">From</FieldLabel>
                    <DatePicker
                        id="audit-filter-from"
                        data-testid="audit-filter-from"
                        placeholder="Any date"
                        :model-value="query.occurred_from ?? null"
                        @update:model-value="visit({ occurred_from: $event, page: 1 })"
                    />
                </Field>
                <Field class="w-full sm:w-44">
                    <FieldLabel for="audit-filter-to">To</FieldLabel>
                    <DatePicker
                        id="audit-filter-to"
                        data-testid="audit-filter-to"
                        placeholder="Any date"
                        :model-value="query.occurred_to ?? null"
                        @update:model-value="visit({ occurred_to: $event, page: 1 })"
                    />
                </Field>
            </form>
        </template>
        <template #cell-at="{ item }">{{ row(item).at }}</template>
        <template #cell-outcome="{ item }">
            <Badge v-if="row(item).outcome" :variant="row(item).outcome === 'SUCCESS' ? 'success' : 'warning'">
                {{ label(row(item).outcome ?? '') }}
            </Badge>
            <template v-else>—</template>
        </template>
        <template #cell-target="{ item }">{{ row(item).target ?? '—' }}</template>
        <template #cell-subject="{ item }">{{ row(item).subject ?? '—' }}</template>
        <template #cell-ip="{ item }">{{ row(item).ip ?? '—' }}</template>
        <template #cell-record="{ item }">
            <Link
                v-if="row(item).record"
                :href="`/nscmf/${row(item).record?.id}`"
                class="font-medium text-primary underline-offset-4 hover:underline"
            >
                {{ row(item).record?.request_no ?? `#${row(item).record?.id}` }}
            </Link>
            <template v-else>—</template>
        </template>
    </ResourceTable>
</template>
