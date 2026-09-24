<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed, ref } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import { buttonVariants } from '@/components/ui/button';
import DetailList, { type DetailItem } from '@/features/nscmf/DetailList.vue';
import DetailTable from '@/features/nscmf/DetailTable.vue';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
import {
    type NscmfDetailRecord,
    ANNOUNCEMENT_TIMING_LABELS,
    FAMILY_LABELS,
    MONITORING_UNIT_LABELS,
    REFERENCE_TYPE_LABELS,
    SERVICE_IMPACT_LABELS,
    SERVICE_STATUS_LABELS,
    SUBTYPE_LABELS,
} from '@/features/nscmf/types';

export type { NscmfDetailRecord };

type Value = string | number | boolean | null | undefined;

const props = withDefaults(
    defineProps<{
        record: NscmfDetailRecord;
        backHref?: string;
        backLabel?: string;
    }>(),
    { backHref: '/history', backLabel: 'Back to history' },
);

const TABS = [
    { key: 'form', label: 'Form' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'attachments', label: 'Attachments' },
] as const;
const activeTab = ref<(typeof TABS)[number]['key']>('form');

function moveTab(event: KeyboardEvent, key: (typeof TABS)[number]['key']): void {
    const index = TABS.findIndex((tab) => tab.key === key);
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const nextTab = TABS[next];
    if (!nextTab) return;
    activeTab.value = nextTab.key;
    const button = event.currentTarget as HTMLButtonElement;
    button.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
}

/** Missing values show a neutral dash; 0 and false are real values. */
function display(value: Value): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

function items<T extends object>(
    source: T | null | undefined,
    fields: [keyof T & string, string][],
    prefix = '',
): DetailItem[] {
    return fields.map(([key, label]) => ({
        key: `${prefix}${key}`,
        label,
        value: display((source?.[key] ?? null) as Value),
    }));
}

const signoffs = computed(() => [
    {
        testid: 'signoff-requested-by',
        label: 'Requested by',
        person: props.record.requested_by,
        at: props.record.first_submitted_at,
    },
    {
        testid: 'signoff-reviewed-by',
        label: 'Reviewed by',
        person: props.record.reviewed_by,
        at: props.record.reviewed_at,
    },
    {
        testid: 'signoff-approved-by',
        label: 'Approved by',
        person: props.record.approved_by,
        at: props.record.approved_at,
    },
]);

const summary = computed<DetailItem[]>(() => [
    { key: 'request_date', label: 'Request date', value: display(props.record.request_date) },
    { key: 'record_version', label: 'Version', value: display(props.record.record_version) },
    { key: 'owner', label: 'Owner', value: display(props.record.owner?.name) },
    { key: 'team', label: 'Team', value: display(props.record.team?.name) },
]);

const activation = computed(() => {
    const a = props.record.activation ?? {};
    return {
        general: items(a, [
            ['customer_name', 'Customer name'],
            ['contact_name', 'Contact name'],
            ['installation_rfs_date', 'Installation (RFS) date'],
        ]),
        network: items(a, [
            ['lan_ip_allocation', 'LAN IP allocation'],
            ['wan_ip', 'WAN IP'],
            ['gateway', 'Gateway'],
            ['pop', 'POP'],
            ['regional', 'Regional'],
            ['preferred_upstream', 'Preferred upstream'],
            ['secondary_upstream', 'Secondary upstream'],
            ['primary_noc_link', 'Primary link to NOC'],
            ['secondary_noc_link', 'Secondary link to NOC'],
            ['downlink_router', 'Downlink router'],
        ]),
        bandwidth: items(a, [
            ['bandwidth_international_mbps', 'International (Mbps)'],
            ['bandwidth_domestic_iix_mbps', 'Domestic / IIX (Mbps)'],
            ['bandwidth_mixed_mbps', 'International & IIX mixed (Mbps)'],
        ]),
        hosting: items(a, [
            ['domain_name_1', 'Domain name 1'],
            ['domain_name_2', 'Domain name 2'],
            ['primary_dns', 'Primary DNS'],
            ['secondary_dns', 'Secondary DNS'],
            ['mx_primary', 'MX primary'],
            ['mx_secondary', 'MX secondary'],
            ['hosting_platform', 'Hosting platform'],
            ['hosting_capacity_gb', 'Hosting capacity (GB)'],
            ['migrate_domain', 'Migrate domain'],
            ['migrate_hosting', 'Migrate hosting'],
        ]),
        directSite: items(
            a.direct_site,
            [
                ['local_loops', 'Local loops'],
                ['lastmile', 'Last mile'],
                ['bwa', 'BWA'],
                ['antenna_tower', 'Antenna / tower'],
                ['direction', 'Direction'],
                ['rssi', 'RSSI'],
                ['latency_ms', 'Latency (ms)'],
                ['packet_loss_percent', 'Packet loss (%)'],
                ['routers', 'Routers'],
                ['ups', 'UPS'],
                ['stabilizer', 'Stabilizer'],
                ['cable', 'Cable'],
            ],
            'direct_site.',
        ),
        popSite: items(
            a.pop_site,
            [
                ['switch_distribution', 'Switch distribution'],
                ['port', 'Port'],
                ['vlan_id', 'VLAN ID'],
                ['local_loops', 'Local loops'],
                ['routers', 'Routers'],
                ['cpe_indoor', 'CPE indoor'],
                ['cpe_outdoor', 'CPE outdoor'],
            ],
            'pop_site.',
        ),
        references: (a.references ?? []).map((row) => ({
            type: REFERENCE_TYPE_LABELS[row.reference_type],
            specification: display(row.specification),
        })),
        serviceBlocks: (a.service_blocks ?? []).map((row) => ({
            context: row.service_context === 'NEW' ? 'New service' : 'Existing service',
            id: display(row.service_id),
            status: display(row.service_status && SERVICE_STATUS_LABELS[row.service_status]),
            description: display(row.service_description),
            location: display(row.service_location),
        })),
        slaItems: (a.sla_items ?? []).map((row) => ({ no: String(row.row_no), text: display(row.requirement_text) })),
        virtualConnections: (a.virtual_connections ?? []).map((row) => ({
            no: String(row.row_no),
            bandwidth: display(row.bandwidth_mbps),
        })),
        priorityDestinations: (a.priority_destinations ?? []).map((row) => ({
            no: String(row.row_no),
            destination: display(row.destination),
        })),
    };
});

const change = computed(() => {
    const c = props.record.change ?? {};
    const monitoring =
        c.monitoring_period_value === null || c.monitoring_period_value === undefined
            ? '—'
            : `${c.monitoring_period_value} ${display(c.monitoring_period_unit && MONITORING_UNIT_LABELS[c.monitoring_period_unit])}`;
    return {
        purpose: items(c, [['maintenance_purpose', 'Maintenance purpose']]),
        plan: [
            ...items(c, [['target_execution_date', 'Target execution date']]),
            { key: 'monitoring_period', label: 'Monitoring period', value: monitoring },
            {
                key: 'announcement_timing',
                label: 'Maintenance announcement',
                value: display(c.announcement_timing && ANNOUNCEMENT_TIMING_LABELS[c.announcement_timing]),
            },
            ...items(c, [['rollback_scenario', 'Rollback scenario']]),
        ],
        challenges: (c.facing_challenges ?? []).map((row) => ({
            no: String(row.row_no),
            text: display(row.challenge_text),
        })),
        problems: (c.identified_problems ?? []).map((row) => ({
            no: String(row.row_no),
            text: display(row.problem_text),
        })),
        impacts: (c.service_impacts ?? []).map((row) => ({
            impact: SERVICE_IMPACT_LABELS[row.impact_code],
            description: display(row.other_description),
        })),
        improvements: (c.improvement_items ?? []).map((row) => ({
            no: String(row.row_no),
            plan: display(row.plan_text),
            kpi: display(row.target_kpi),
        })),
        results: (c.results ?? []).map((row) => ({
            no: String(row.row_no),
            summary: display(row.result_summary),
            performance: display(row.performance_information),
            status: display(row.result_status),
        })),
    };
});

const NUMBERED_TEXT = [
    { key: 'no', label: '#' },
    { key: 'text', label: 'Description' },
];
</script>

<template>
    <div class="mx-auto max-w-5xl space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h1 data-testid="request-no" class="text-xl font-semibold text-foreground">
                        {{ record.request_no }}
                    </h1>
                    <StatusBadge data-testid="business-status-badge" :status="record.business_status" />
                    <Badge v-if="record.is_archived" variant="warning" data-testid="archived-badge">Archived</Badge>
                </div>
                <p data-testid="family-subtype" class="text-sm text-muted-foreground">
                    {{ FAMILY_LABELS[record.family] }} · {{ SUBTYPE_LABELS[record.subtype] }}
                </p>
            </div>
            <Link :href="backHref" :class="buttonVariants({ variant: 'secondary' })">{{ backLabel }}</Link>
        </div>

        <section class="space-y-4 panel p-6">
            <DetailList :items="summary" />
            <dl class="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <div v-for="signoff in signoffs" :key="signoff.testid" :data-testid="signoff.testid">
                    <dt class="text-xs text-muted-foreground">{{ signoff.label }}</dt>
                    <dd class="text-sm text-foreground">{{ display(signoff.person?.name) }}</dd>
                    <dd class="text-xs text-muted-foreground">{{ display(signoff.at) }}</dd>
                </div>
            </dl>
        </section>

        <slot name="actions" />

        <div aria-label="Record detail" role="tablist" class="flex gap-6 border-b border-border">
            <button
                v-for="tab in TABS"
                :key="tab.key"
                type="button"
                role="tab"
                :data-testid="`tab-${tab.key}`"
                :aria-selected="activeTab === tab.key"
                :id="`record-${record.id}-tab-${tab.key}`"
                :aria-controls="`record-${record.id}-panel-${tab.key}`"
                :tabindex="activeTab === tab.key ? 0 : -1"
                @keydown="moveTab($event, tab.key)"
                class="-mb-px border-b-2 px-1 py-2 text-sm font-medium"
                :class="
                    activeTab === tab.key
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                "
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
            </button>
        </div>

        <div
            v-if="activeTab === 'form'"
            :id="`record-${record.id}-panel-form`"
            role="tabpanel"
            :aria-labelledby="`record-${record.id}-tab-form`"
            data-testid="form-detail-section"
            class="space-y-6"
        >
            <template v-if="record.family === 'ACTIVATION'">
                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">General and service</h2>
                    <DetailList :items="activation.general" />
                    <DetailTable
                        data-testid="table-references"
                        title="References"
                        :columns="[
                            { key: 'type', label: 'Type' },
                            { key: 'specification', label: 'Specification' },
                        ]"
                        :rows="activation.references"
                    />
                    <DetailTable
                        data-testid="table-service_blocks"
                        title="Services"
                        :columns="[
                            { key: 'context', label: 'Service' },
                            { key: 'id', label: 'Service ID' },
                            { key: 'status', label: 'Status' },
                            { key: 'description', label: 'Description' },
                            { key: 'location', label: 'Location' },
                        ]"
                        :rows="activation.serviceBlocks"
                    />
                    <DetailTable
                        data-testid="table-sla_items"
                        title="Specific requirements (SLA)"
                        :columns="NUMBERED_TEXT"
                        :rows="activation.slaItems"
                    />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">NOC configuration</h2>
                    <DetailList :items="activation.network" />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Bandwidth</h2>
                    <DetailList :items="activation.bandwidth" />
                    <DetailTable
                        data-testid="table-virtual_connections"
                        title="Virtual connections"
                        :columns="[
                            { key: 'no', label: '#' },
                            { key: 'bandwidth', label: 'Bandwidth (Mbps)' },
                        ]"
                        :rows="activation.virtualConnections"
                    />
                    <DetailTable
                        data-testid="table-priority_destinations"
                        title="Priority destinations"
                        :columns="[
                            { key: 'no', label: '#' },
                            { key: 'destination', label: 'Destination' },
                        ]"
                        :rows="activation.priorityDestinations"
                    />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Domain, DNS and hosting</h2>
                    <DetailList :items="activation.hosting" />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Customer site (direct)</h2>
                    <DetailList :items="activation.directSite" />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Customer site at POP</h2>
                    <DetailList :items="activation.popSite" />
                </section>
            </template>

            <template v-else>
                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Purpose of changes</h2>
                    <DetailList :items="change.purpose" />
                    <DetailTable
                        data-testid="table-facing_challenges"
                        title="Facing challenges"
                        :columns="NUMBERED_TEXT"
                        :rows="change.challenges"
                    />
                    <DetailTable
                        data-testid="table-identified_problems"
                        title="Identified problems"
                        :columns="NUMBERED_TEXT"
                        :rows="change.problems"
                    />
                    <DetailTable
                        data-testid="table-service_impacts"
                        title="Service impact"
                        :columns="[
                            { key: 'impact', label: 'Impact' },
                            { key: 'description', label: 'Description' },
                        ]"
                        :rows="change.impacts"
                    />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Plan, schedule and rollback</h2>
                    <DetailTable
                        data-testid="table-improvement_items"
                        title="Improvement plan and target KPI"
                        :columns="[
                            { key: 'no', label: '#' },
                            { key: 'plan', label: 'Plan' },
                            { key: 'kpi', label: 'Target KPI' },
                        ]"
                        :rows="change.improvements"
                    />
                    <DetailList :items="change.plan" />
                </section>

                <section class="space-y-4 panel p-6">
                    <h2 class="text-base font-semibold">Result of changes</h2>
                    <DetailTable
                        data-testid="table-results"
                        title="Results"
                        :columns="[
                            { key: 'no', label: '#' },
                            { key: 'summary', label: 'Result summary' },
                            { key: 'performance', label: 'Performance information' },
                            { key: 'status', label: 'Status' },
                        ]"
                        :rows="change.results"
                    />
                </section>
            </template>
        </div>

        <div
            v-else
            :id="`record-${record.id}-panel-${activeTab}`"
            role="tabpanel"
            :aria-labelledby="`record-${record.id}-tab-${activeTab}`"
        >
            <slot :name="activeTab">
                <p :data-testid="`${activeTab}-stub`" class="panel p-8 text-center text-sm text-muted-foreground">
                    {{ activeTab === 'timeline' ? 'The timeline' : 'Attachments' }} are not available yet.
                </p>
            </slot>
        </div>
    </div>
</template>
