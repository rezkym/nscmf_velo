<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import type { BusinessStatus } from '@/features/nscmf/contracts';
import AppLayout from '@/layouts/AppLayout.vue';

interface UserSnapshot {
    id: number;
    name: string;
}

interface TeamSnapshot {
    id: number;
    name: string;
}

interface ReferenceItem {
    reference_type: string;
    specification: string | null;
}

interface ServiceBlockItem {
    service_context: string;
    service_id: string;
    service_status: string;
    service_description: string;
    service_location: string;
}

interface SlaItem {
    row_no: number;
    requirement_text: string;
}

interface VirtualConnectionItem {
    row_no: number;
    bandwidth_mbps: number;
}

interface PriorityDestinationItem {
    row_no: number;
    destination: string;
}

interface DirectSite {
    local_loops?: string | null;
    lastmile?: string | null;
    bwa?: string | null;
    antenna_tower?: string | null;
    direction?: string | null;
    rssi?: number | null;
    latency_ms?: number | null;
    packet_loss_percent?: number | null;
    routers?: string | null;
    ups?: string | null;
    stabilizer?: string | null;
    cable?: string | null;
}

interface PopSite {
    switch_distribution?: string | null;
    port?: string | null;
    vlan_id?: number | null;
    local_loops?: string | null;
    routers?: string | null;
    cpe_indoor?: string | null;
    cpe_outdoor?: string | null;
}

interface ActivationDetail {
    customer_name?: string | null;
    contact_name?: string | null;
    installation_rfs_date?: string | null;
    lan_ip_allocation?: string | null;
    wan_ip?: string | null;
    gateway?: string | null;
    pop?: string | null;
    regional?: string | null;
    preferred_upstream?: string | null;
    secondary_upstream?: string | null;
    primary_noc_link?: string | null;
    secondary_noc_link?: string | null;
    downlink_router?: string | null;
    bandwidth_international_mbps?: number | null;
    bandwidth_domestic_iix_mbps?: number | null;
    bandwidth_mixed_mbps?: number | null;
    domain_name_1?: string | null;
    domain_name_2?: string | null;
    primary_dns?: string | null;
    secondary_dns?: string | null;
    mx_primary?: string | null;
    mx_secondary?: string | null;
    hosting_platform?: string | null;
    hosting_capacity_gb?: number | null;
    migrate_domain?: boolean;
    migrate_hosting?: boolean;
    references?: ReferenceItem[];
    service_blocks?: ServiceBlockItem[];
    sla_items?: SlaItem[];
    virtual_connections?: VirtualConnectionItem[];
    priority_destinations?: PriorityDestinationItem[];
    direct_site?: DirectSite | null;
    pop_site?: PopSite | null;
}

interface FacingChallengeItem {
    row_no: number;
    challenge_text: string;
}

interface IdentifiedProblemItem {
    row_no: number;
    problem_text: string;
}

interface ServiceImpactItem {
    impact_code: string;
    other_description?: string | null;
}

interface ImprovementItem {
    row_no: number;
    plan_text: string;
    target_kpi: string;
}

interface ChangeResultItem {
    row_no: number;
    result_summary?: string | null;
    performance_information?: string | null;
    result_status?: string | null;
}

interface ChangeDetail {
    maintenance_purpose?: string | null;
    target_execution_date?: string | null;
    monitoring_period_value?: number | null;
    monitoring_period_unit?: string | null;
    rollback_scenario?: string | null;
    announcement_timing?: string | null;
    facing_challenges?: FacingChallengeItem[];
    identified_problems?: IdentifiedProblemItem[];
    service_impacts?: ServiceImpactItem[];
    improvement_items?: ImprovementItem[];
    results?: ChangeResultItem[];
}

export interface NscmfDetailRecord {
    id: number;
    request_no: string;
    family: 'ACTIVATION' | 'CHANGE';
    subtype: string;
    request_date?: string | null;
    business_status: BusinessStatus;
    record_version: number;
    is_archived: boolean;
    owner?: UserSnapshot | null;
    team?: TeamSnapshot | null;
    created_at?: string | null;
    updated_at?: string | null;
    requested_by?: UserSnapshot | null;
    first_submitted_at?: string | null;
    reviewed_by?: UserSnapshot | null;
    reviewed_at?: string | null;
    approved_by?: UserSnapshot | null;
    approved_at?: string | null;
    activation?: ActivationDetail;
    change?: ChangeDetail;
    allowed_actions?: string[];
}

const props = defineProps<{
    record: NscmfDetailRecord;
}>();

const activeTab = ref<'form' | 'timeline' | 'attachments'>('form');

// Helper to format values neutrally without coercing null to 0
function formatNeutral(val: string | number | boolean | null | undefined): string {
    if (val === null || val === undefined || val === '') {
        return '—';
    }
    return String(val);
}

// Business status label mapping (per 07 §33)
const statusLabelMap: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Pending Review',
    REVISION_REQUIRED: 'Revision Required',
    PENDING_APPROVAL: 'Pending Approval',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    CANCELLED: 'Cancelled',
};

const displayBusinessStatus = computed(() => {
    return statusLabelMap[props.record.business_status] || props.record.business_status;
});
</script>

<template>
    <AppLayout :title="`NSCMF - ${record.request_no}`">
        <Head :title="`NSCMF - ${record.request_no}`" />

        <div class="space-y-6">
            <!-- Header Section -->
            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h1 data-testid="request-no" class="text-2xl font-bold tracking-tight">
                                {{ record.request_no }}
                            </h1>
                            <!-- Business Status Badge -->
                            <span
                                data-testid="business-status-badge"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                            >
                                {{ displayBusinessStatus }}
                            </span>
                            <!-- Separate Archived Badge -->
                            <span
                                v-if="record.is_archived"
                                data-testid="archived-badge"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border"
                            >
                                Archived
                            </span>
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">
                            <span data-testid="family-subtype" class="font-medium text-foreground">
                                {{ record.family }} / {{ record.subtype }}
                            </span>
                            • Version <span data-testid="record-version">{{ record.record_version }}</span>
                        </p>
                    </div>

                    <div class="flex items-center gap-2">
                        <Link
                            href="/nscmf"
                            class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                        >
                            Back to List
                        </Link>
                    </div>
                </div>

                <!-- Snapshot Info & Sign-offs Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-sm">
                    <!-- Owner / Team Snapshot -->
                    <div class="border-r pr-4">
                        <span class="text-xs text-muted-foreground block uppercase font-medium">Owner & Team</span>
                        <div data-testid="owner-name" class="font-medium text-foreground mt-1">
                            {{ formatNeutral(record.owner?.name) }}
                        </div>
                        <div data-testid="team-name" class="text-xs text-muted-foreground">
                            {{ formatNeutral(record.team?.name) }}
                        </div>
                    </div>

                    <!-- Requested By -->
                    <div data-testid="signoff-requested-by" class="border-r pr-4">
                        <span class="text-xs text-muted-foreground block uppercase font-medium">Requested By</span>
                        <div class="font-medium text-foreground mt-1">
                            {{ formatNeutral(record.requested_by?.name) }}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            {{ formatNeutral(record.first_submitted_at) }}
                        </div>
                    </div>

                    <!-- Reviewed By (Effective projection) -->
                    <div data-testid="signoff-reviewed-by" class="border-r pr-4">
                        <span class="text-xs text-muted-foreground block uppercase font-medium">Reviewed By</span>
                        <div class="font-medium text-foreground mt-1">
                            {{ formatNeutral(record.reviewed_by?.name) }}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            {{ formatNeutral(record.reviewed_at) }}
                        </div>
                    </div>

                    <!-- Approved By (Human actor, distinct from PDF signer) -->
                    <div data-testid="signoff-approved-by">
                        <span class="text-xs text-muted-foreground block uppercase font-medium">Approved By</span>
                        <div class="font-medium text-foreground mt-1">
                            {{ formatNeutral(record.approved_by?.name) }}
                        </div>
                        <div class="text-xs text-muted-foreground">
                            {{ formatNeutral(record.approved_at) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="border-b border-border">
                <nav class="flex space-x-6" role="tablist">
                    <button
                        role="tab"
                        :aria-selected="activeTab === 'form'"
                        class="py-3 px-1 border-b-2 font-medium text-sm transition-colors"
                        :class="
                            activeTab === 'form'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        "
                        @click="activeTab = 'form'"
                    >
                        Form Detail
                    </button>
                    <button
                        role="tab"
                        :aria-selected="activeTab === 'timeline'"
                        class="py-3 px-1 border-b-2 font-medium text-sm transition-colors"
                        :class="
                            activeTab === 'timeline'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        "
                        @click="activeTab = 'timeline'"
                    >
                        Timeline
                    </button>
                    <button
                        role="tab"
                        :aria-selected="activeTab === 'attachments'"
                        class="py-3 px-1 border-b-2 font-medium text-sm transition-colors"
                        :class="
                            activeTab === 'attachments'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        "
                        @click="activeTab = 'attachments'"
                    >
                        Attachments
                    </button>
                </nav>
            </div>

            <!-- Tab Content -->
            <div class="mt-4">
                <!-- FORM DETAIL TAB -->
                <div v-if="activeTab === 'form'" data-testid="form-detail-section" class="space-y-6">
                    <!-- ACTIVATION FAMILY DISPLAY -->
                    <div v-if="record.family === 'ACTIVATION' && record.activation" class="space-y-6">
                        <!-- General Info -->
                        <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 class="text-lg font-semibold border-b pb-2">General Information</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span class="text-xs text-muted-foreground block">Customer Name</span>
                                    <span data-testid="activation-customer-name" class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.customer_name) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block">Contact Name</span>
                                    <span data-testid="activation-contact-name" class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.contact_name) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block">Installation RFS Date</span>
                                    <span class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.installation_rfs_date) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block"
                                        >Bandwidth International (Mbps)</span
                                    >
                                    <span data-testid="activation-bw-intl" class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.bandwidth_international_mbps) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block"
                                        >Bandwidth Domestic IIX (Mbps)</span
                                    >
                                    <span data-testid="activation-bw-dom" class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.bandwidth_domestic_iix_mbps) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block">Bandwidth Mixed (Mbps)</span>
                                    <span class="font-medium text-foreground">
                                        {{ formatNeutral(record.activation.bandwidth_mixed_mbps) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- References Collection -->
                        <div
                            v-if="record.activation.references && record.activation.references.length > 0"
                            class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4"
                        >
                            <h3 class="text-lg font-semibold border-b pb-2">References</h3>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th class="px-4 py-2">Type</th>
                                            <th class="px-4 py-2">Specification</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        <tr v-for="(refItem, idx) in record.activation.references" :key="idx">
                                            <td class="px-4 py-2 font-medium">{{ refItem.reference_type }}</td>
                                            <td class="px-4 py-2">{{ formatNeutral(refItem.specification) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Service Blocks Collection -->
                        <div
                            v-if="record.activation.service_blocks && record.activation.service_blocks.length > 0"
                            class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4"
                        >
                            <h3 class="text-lg font-semibold border-b pb-2">Service Blocks</h3>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th class="px-4 py-2">Context</th>
                                            <th class="px-4 py-2">Service ID</th>
                                            <th class="px-4 py-2">Status</th>
                                            <th class="px-4 py-2">Description</th>
                                            <th class="px-4 py-2">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        <tr v-for="(sb, idx) in record.activation.service_blocks" :key="idx">
                                            <td class="px-4 py-2 font-medium">{{ sb.service_context }}</td>
                                            <td class="px-4 py-2">{{ sb.service_id }}</td>
                                            <td class="px-4 py-2">{{ sb.service_status }}</td>
                                            <td class="px-4 py-2">{{ sb.service_description }}</td>
                                            <td class="px-4 py-2">{{ sb.service_location }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- SLA, Virtual Connections, Priority Destinations Collections -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- SLA Items -->
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3">
                                <h4 class="font-semibold text-sm border-b pb-2">SLA Requirements</h4>
                                <ul
                                    v-if="record.activation.sla_items && record.activation.sla_items.length > 0"
                                    class="space-y-2 text-sm"
                                >
                                    <li v-for="sla in record.activation.sla_items" :key="sla.row_no">
                                        <span class="text-muted-foreground">{{ sla.row_no }}.</span>
                                        {{ sla.requirement_text }}
                                    </li>
                                </ul>
                                <span v-else class="text-xs text-muted-foreground">None</span>
                            </div>

                            <!-- Virtual Connections -->
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3">
                                <h4 class="font-semibold text-sm border-b pb-2">Virtual Connections</h4>
                                <ul
                                    v-if="
                                        record.activation.virtual_connections &&
                                        record.activation.virtual_connections.length > 0
                                    "
                                    class="space-y-2 text-sm"
                                >
                                    <li v-for="vc in record.activation.virtual_connections" :key="vc.row_no">
                                        <span class="text-muted-foreground">{{ vc.row_no }}.</span>
                                        {{ vc.bandwidth_mbps }} Mbps
                                    </li>
                                </ul>
                                <span v-else class="text-xs text-muted-foreground">None</span>
                            </div>

                            <!-- Priority Destinations -->
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3">
                                <h4 class="font-semibold text-sm border-b pb-2">Priority Destinations</h4>
                                <ul
                                    v-if="
                                        record.activation.priority_destinations &&
                                        record.activation.priority_destinations.length > 0
                                    "
                                    class="space-y-2 text-sm"
                                >
                                    <li v-for="pd in record.activation.priority_destinations" :key="pd.row_no">
                                        <span class="text-muted-foreground">{{ pd.row_no }}.</span> {{ pd.destination }}
                                    </li>
                                </ul>
                                <span v-else class="text-xs text-muted-foreground">None</span>
                            </div>
                        </div>

                        <!-- Direct Site & POP Site 1:1 Blocks -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Direct Site -->
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4">
                                <h3 class="text-md font-semibold border-b pb-2">Direct Site Details</h3>
                                <div v-if="record.activation.direct_site" class="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span class="text-xs text-muted-foreground block">Latency (ms)</span>
                                        <span data-testid="direct-site-latency" class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.direct_site.latency_ms) }}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-xs text-muted-foreground block">Packet Loss (%)</span>
                                        <span class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.direct_site.packet_loss_percent) }}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-xs text-muted-foreground block">RSSI</span>
                                        <span data-testid="direct-site-rssi" class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.direct_site.rssi) }}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-xs text-muted-foreground block">Routers</span>
                                        <span class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.direct_site.routers) }}
                                        </span>
                                    </div>
                                </div>
                                <span v-else class="text-xs text-muted-foreground">Not provided</span>
                            </div>

                            <!-- POP Site -->
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4">
                                <h3 class="text-md font-semibold border-b pb-2">POP Site Details</h3>
                                <div v-if="record.activation.pop_site" class="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span class="text-xs text-muted-foreground block">VLAN ID</span>
                                        <span class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.pop_site.vlan_id) }}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-xs text-muted-foreground block">Port</span>
                                        <span class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.pop_site.port) }}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-xs text-muted-foreground block">Switch Distribution</span>
                                        <span class="font-medium text-foreground">
                                            {{ formatNeutral(record.activation.pop_site.switch_distribution) }}
                                        </span>
                                    </div>
                                </div>
                                <span v-else class="text-xs text-muted-foreground">Not provided</span>
                            </div>
                        </div>
                    </div>

                    <!-- CHANGE FAMILY DISPLAY -->
                    <div v-else-if="record.family === 'CHANGE' && record.change" class="space-y-6">
                        <!-- Maintenance Purpose & Planning -->
                        <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 class="text-lg font-semibold border-b pb-2">Change Plan & Purpose</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div class="col-span-full">
                                    <span class="text-xs text-muted-foreground block">Maintenance Purpose</span>
                                    <p data-testid="change-purpose" class="mt-1 text-foreground whitespace-pre-wrap">
                                        {{ formatNeutral(record.change.maintenance_purpose) }}
                                    </p>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block">Target Execution Date</span>
                                    <span class="font-medium text-foreground">
                                        {{ formatNeutral(record.change.target_execution_date) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-muted-foreground block">Monitoring Period</span>
                                    <span class="font-medium text-foreground">
                                        {{
                                            record.change.monitoring_period_value !== null &&
                                            record.change.monitoring_period_value !== undefined
                                                ? `${record.change.monitoring_period_value} ${record.change.monitoring_period_unit || ''}`
                                                : '—'
                                        }}
                                    </span>
                                </div>
                                <div class="col-span-full">
                                    <span class="text-xs text-muted-foreground block">Rollback Scenario</span>
                                    <p data-testid="change-rollback" class="mt-1 text-foreground whitespace-pre-wrap">
                                        {{ formatNeutral(record.change.rollback_scenario) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Challenges & Identified Problems -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3">
                                <h4 class="font-semibold text-sm border-b pb-2">Facing Challenges</h4>
                                <ul
                                    v-if="record.change.facing_challenges && record.change.facing_challenges.length > 0"
                                    class="space-y-2 text-sm"
                                >
                                    <li v-for="fc in record.change.facing_challenges" :key="fc.row_no">
                                        <span class="text-muted-foreground">{{ fc.row_no }}.</span>
                                        {{ fc.challenge_text }}
                                    </li>
                                </ul>
                                <span v-else class="text-xs text-muted-foreground">None</span>
                            </div>

                            <div class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3">
                                <h4 class="font-semibold text-sm border-b pb-2">Identified Problems</h4>
                                <ul
                                    v-if="
                                        record.change.identified_problems &&
                                        record.change.identified_problems.length > 0
                                    "
                                    class="space-y-2 text-sm"
                                >
                                    <li v-for="ip in record.change.identified_problems" :key="ip.row_no">
                                        <span class="text-muted-foreground">{{ ip.row_no }}.</span>
                                        {{ ip.problem_text }}
                                    </li>
                                </ul>
                                <span v-else class="text-xs text-muted-foreground">None</span>
                            </div>
                        </div>

                        <!-- Service Impacts -->
                        <div
                            v-if="record.change.service_impacts && record.change.service_impacts.length > 0"
                            class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3"
                        >
                            <h4 class="font-semibold text-sm border-b pb-2">Service Impacts</h4>
                            <div class="flex flex-wrap gap-2">
                                <div
                                    v-for="(impact, idx) in record.change.service_impacts"
                                    :key="idx"
                                    class="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-muted text-foreground border"
                                >
                                    <span class="font-semibold">{{ impact.impact_code }}</span>
                                    <span v-if="impact.other_description" class="ml-1 text-muted-foreground">
                                        ({{ impact.other_description }})
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Improvement Items -->
                        <div
                            v-if="record.change.improvement_items && record.change.improvement_items.length > 0"
                            class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3"
                        >
                            <h4 class="font-semibold text-sm border-b pb-2">Improvement Items</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th class="px-4 py-2">#</th>
                                            <th class="px-4 py-2">Plan</th>
                                            <th class="px-4 py-2">Target KPI</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        <tr v-for="item in record.change.improvement_items" :key="item.row_no">
                                            <td class="px-4 py-2 font-medium">{{ item.row_no }}</td>
                                            <td class="px-4 py-2">{{ item.plan_text }}</td>
                                            <td class="px-4 py-2">{{ item.target_kpi }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Results of Change -->
                        <div
                            v-if="record.change.results && record.change.results.length > 0"
                            data-testid="change-results"
                            class="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-3"
                        >
                            <h4 class="font-semibold text-sm border-b pb-2">Results of Change</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th class="px-4 py-2">#</th>
                                            <th class="px-4 py-2">Result Summary</th>
                                            <th class="px-4 py-2">Performance Information</th>
                                            <th class="px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        <tr v-for="res in record.change.results" :key="res.row_no">
                                            <td class="px-4 py-2 font-medium">{{ res.row_no }}</td>
                                            <td class="px-4 py-2">{{ formatNeutral(res.result_summary) }}</td>
                                            <td class="px-4 py-2">{{ formatNeutral(res.performance_information) }}</td>
                                            <td class="px-4 py-2 font-medium">
                                                {{ formatNeutral(res.result_status) }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TIMELINE TAB (Unavailable / Stub) -->
                <div
                    v-else-if="activeTab === 'timeline'"
                    data-testid="timeline-stub"
                    class="p-8 text-center border rounded-lg bg-card"
                >
                    <p class="text-sm text-muted-foreground">Timeline history unavailable</p>
                </div>

                <!-- ATTACHMENTS TAB (Unavailable / Stub) -->
                <div
                    v-else-if="activeTab === 'attachments'"
                    data-testid="attachments-stub"
                    class="p-8 text-center border rounded-lg bg-card"
                >
                    <p class="text-sm text-muted-foreground">Attachments unavailable</p>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
