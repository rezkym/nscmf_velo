<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectionCard from '@/components/SectionCard.vue';
import { usePermissions } from '@/composables/usePermissions';
import DetailList, { type DetailItem } from '@/features/nscmf/DetailList.vue';
import DetailTable from '@/features/nscmf/DetailTable.vue';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
import {
    ACTIVATION_COLLECTIONS,
    ACTIVATION_GROUPS,
    CHANGE_COLLECTIONS,
    CHANGE_GROUPS,
    type CollectionSpec,
    detailItems,
    display,
    type Row,
    SITE_BLOCKS,
    tableRows,
} from '@/features/nscmf/recordFields';
import { type NscmfDetailRecord, FAMILY_LABELS, MONITORING_UNIT_LABELS, SUBTYPE_LABELS } from '@/features/nscmf/types';
import { formatJakarta } from '@/lib/datetime';

export type { NscmfDetailRecord };

const props = defineProps<{
    record: NscmfDetailRecord;
    backHref?: string;
    backLabel?: string;
}>();

const { can } = usePermissions();

// Without its own destination the page returns to History, or to the Dashboard when History is not allowed.
const back = computed(() => {
    if (props.backHref) return { href: props.backHref, label: props.backLabel };
    return can('nscmf.view.history')
        ? { href: '/history', label: 'Back to history' }
        : { href: '/dashboard', label: 'Back to dashboard' };
});

const TABS = [
    { key: 'form', label: 'Form' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'attachments', label: 'Attachments' },
] as const;

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
        general: detailItems(a, ACTIVATION_GROUPS.general.fields),
        network: detailItems(a, ACTIVATION_GROUPS.network.fields),
        bandwidth: detailItems(a, ACTIVATION_GROUPS.bandwidth.fields),
        hosting: detailItems(a, ACTIVATION_GROUPS.hosting.fields),
        directSite: detailItems(a.direct_site, SITE_BLOCKS.direct_site.fields, 'direct_site.'),
        popSite: detailItems(a.pop_site, SITE_BLOCKS.pop_site.fields, 'pop_site.'),
    };
});

const change = computed(() => {
    const c = props.record.change ?? {};
    const monitoring =
        c.monitoring_period_value === null || c.monitoring_period_value === undefined
            ? '—'
            : `${c.monitoring_period_value} ${display(c.monitoring_period_unit && MONITORING_UNIT_LABELS[c.monitoring_period_unit])}`;
    return {
        purpose: detailItems(c, CHANGE_GROUPS.purpose.fields),
        // Form Detail reads the monitoring amount and its unit as one value.
        plan: CHANGE_GROUPS.plan.fields.flatMap((spec) => {
            if (spec.key === 'monitoring_period_unit') return [];
            if (spec.key === 'monitoring_period_value')
                return [{ key: 'monitoring_period', label: spec.label, value: monitoring }];
            return detailItems(c, [spec]);
        }),
    };
});

/** Each collection as its title, columns and display rows, keyed by the collection's field name. */
const tables = computed(() => {
    const a = props.record.activation ?? {};
    const c = props.record.change ?? {};
    const table = (spec: CollectionSpec, rows: Row[] | undefined) => ({ ...spec, rows: tableRows(spec, rows) });
    return {
        references: table(ACTIVATION_COLLECTIONS.references, a.references),
        service_blocks: table(ACTIVATION_COLLECTIONS.service_blocks, a.service_blocks),
        sla_items: table(ACTIVATION_COLLECTIONS.sla_items, a.sla_items),
        virtual_connections: table(ACTIVATION_COLLECTIONS.virtual_connections, a.virtual_connections),
        priority_destinations: table(ACTIVATION_COLLECTIONS.priority_destinations, a.priority_destinations),
        facing_challenges: table(CHANGE_COLLECTIONS.facing_challenges, c.facing_challenges),
        identified_problems: table(CHANGE_COLLECTIONS.identified_problems, c.identified_problems),
        service_impacts: table(CHANGE_COLLECTIONS.service_impacts, c.service_impacts),
        improvement_items: table(CHANGE_COLLECTIONS.improvement_items, c.improvement_items),
        results: table(CHANGE_COLLECTIONS.results, c.results),
    };
});
</script>

<template>
    <div class="mx-auto max-w-5xl space-y-6">
        <PageHeader :title="record.request_no">
            <template #title>
                <span data-testid="request-no" class="break-all">{{ record.request_no }}</span>
            </template>
            <div class="flex flex-wrap items-center gap-2">
                <StatusBadge data-testid="business-status-badge" :status="record.business_status" />
                <!-- Archived is its own flag, never a business status (07 §33). -->
                <Badge v-if="record.is_archived" variant="warning" data-testid="archived-badge">Archived</Badge>
                <p data-testid="family-subtype" class="text-sm text-muted-foreground">
                    {{ FAMILY_LABELS[record.family] }} · {{ SUBTYPE_LABELS[record.subtype] }}
                </p>
            </div>
            <template #actions>
                <Button as-child variant="outline">
                    <Link :href="back.href">{{ back.label }}</Link>
                </Button>
            </template>
        </PageHeader>

        <Card>
            <CardContent class="grid gap-4">
                <DetailList :items="summary" />
                <dl class="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
                    <div v-for="signoff in signoffs" :key="signoff.testid" :data-testid="signoff.testid">
                        <dt class="text-xs text-muted-foreground">{{ signoff.label }}</dt>
                        <dd>{{ display(signoff.person?.name) }}</dd>
                        <dd class="text-xs text-muted-foreground">{{ formatJakarta(signoff.at) }}</dd>
                    </div>
                </dl>
            </CardContent>
        </Card>

        <slot name="actions" />

        <Tabs default-value="form" class="gap-4">
            <TabsList variant="line" aria-label="Record detail">
                <TabsTrigger v-for="tab in TABS" :key="tab.key" :value="tab.key" :data-testid="`tab-${tab.key}`">
                    {{ tab.label }}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="form">
                <div data-testid="form-detail-section" class="grid gap-6">
                    <template v-if="record.family === 'ACTIVATION'">
                        <SectionCard :title="ACTIVATION_GROUPS.general.title">
                            <DetailList :items="activation.general" />
                            <DetailTable data-testid="table-references" v-bind="tables.references" />
                            <DetailTable data-testid="table-service_blocks" v-bind="tables.service_blocks" />
                            <DetailTable data-testid="table-sla_items" v-bind="tables.sla_items" />
                        </SectionCard>

                        <SectionCard :title="ACTIVATION_GROUPS.network.title">
                            <DetailList :items="activation.network" />
                        </SectionCard>

                        <SectionCard :title="ACTIVATION_GROUPS.bandwidth.title">
                            <DetailList :items="activation.bandwidth" />
                            <DetailTable data-testid="table-virtual_connections" v-bind="tables.virtual_connections" />
                            <DetailTable
                                data-testid="table-priority_destinations"
                                v-bind="tables.priority_destinations"
                            />
                        </SectionCard>

                        <SectionCard :title="ACTIVATION_GROUPS.hosting.title">
                            <DetailList :items="activation.hosting" />
                        </SectionCard>

                        <SectionCard :title="SITE_BLOCKS.direct_site.title">
                            <DetailList :items="activation.directSite" />
                        </SectionCard>

                        <SectionCard :title="SITE_BLOCKS.pop_site.title">
                            <DetailList :items="activation.popSite" />
                        </SectionCard>
                    </template>

                    <template v-else>
                        <SectionCard :title="CHANGE_GROUPS.purpose.title">
                            <DetailList :items="change.purpose" />
                            <DetailTable data-testid="table-facing_challenges" v-bind="tables.facing_challenges" />
                            <DetailTable data-testid="table-identified_problems" v-bind="tables.identified_problems" />
                            <DetailTable data-testid="table-service_impacts" v-bind="tables.service_impacts" />
                        </SectionCard>

                        <SectionCard :title="CHANGE_GROUPS.plan.title">
                            <DetailTable data-testid="table-improvement_items" v-bind="tables.improvement_items" />
                            <DetailList :items="change.plan" />
                        </SectionCard>

                        <SectionCard title="Result of changes">
                            <DetailTable data-testid="table-results" v-bind="tables.results" />
                        </SectionCard>
                    </template>
                </div>
            </TabsContent>

            <TabsContent v-for="tab in TABS.slice(1)" :key="tab.key" :value="tab.key">
                <slot :name="tab.key">
                    <Card :data-testid="`${tab.key}-stub`">
                        <CardContent class="py-4 text-center text-muted-foreground">
                            {{ tab.key === 'timeline' ? 'The timeline' : 'Attachments' }} are not available yet.
                        </CardContent>
                    </Card>
                </slot>
            </TabsContent>
        </Tabs>
    </div>
</template>
