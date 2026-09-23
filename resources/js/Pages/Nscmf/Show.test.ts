import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import type { NscmfDetailRecord } from '@/features/nscmf/types';

import Show from './Show.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const BASE: Omit<NscmfDetailRecord, 'family' | 'subtype'> = {
    id: 101,
    request_no: 'DEMO-ACT-005',
    request_date: '2026-09-01',
    business_status: 'APPROVED',
    record_version: 3,
    is_archived: false,
    owner: { id: 1, name: 'Demo Requester A' },
    team: { id: 1, name: 'Demo Team Alpha' },
    requested_by: { id: 1, name: 'Demo Requester A' },
    first_submitted_at: '2026-09-02T09:00:00+07:00',
    reviewed_by: { id: 3, name: 'Demo Reviewer' },
    reviewed_at: '2026-09-03T10:00:00+07:00',
    approved_by: { id: 4, name: 'Demo Approver' },
    approved_at: '2026-09-04T11:00:00+07:00',
};

function mountShow(record: NscmfDetailRecord): VueWrapper {
    return mount(Show, { props: { record, attachments: [] } });
}

function field(wrapper: VueWrapper, key: string): string {
    return wrapper.get(`[data-testid="field-${key}"]`).text();
}

describe('Record detail (FE-18)', () => {
    beforeEach(() => {
        resetInertia({ auth: { permissions: ['nscmf.view'] } });
    });

    it('shows the header with labels, not raw codes, and links back to history', () => {
        const wrapper = mountShow({ ...BASE, family: 'ACTIVATION', subtype: 'UPGRADE_DOWNGRADE', activation: {} });

        expect(wrapper.get('[data-testid="request-no"]').text()).toBe('DEMO-ACT-005');
        expect(wrapper.get('[data-testid="family-subtype"]').text()).toBe('Activation · Upgrade / Downgrade');
        expect(field(wrapper, 'request_date')).toBe('2026-09-01');
        expect(field(wrapper, 'record_version')).toBe('3');
        expect(field(wrapper, 'owner')).toBe('Demo Requester A');
        expect(field(wrapper, 'team')).toBe('Demo Team Alpha');
        expect(wrapper.get('#main-content a[href="/history"]').text()).toBe('Back to history');
    });

    it('AC1: keeps the business status and the archived flag separate', () => {
        const wrapper = mountShow({ ...BASE, is_archived: true, family: 'CHANGE', subtype: 'MAINTENANCE', change: {} });

        expect(wrapper.get('[data-testid="business-status-badge"]').text()).toBe('Approved');
        expect(wrapper.get('[data-testid="archived-badge"]').text()).toBe('Archived');
    });

    it('AC2: shows the effective sign-offs from the server, including a cleared review', () => {
        const wrapper = mountShow({
            ...BASE,
            business_status: 'PENDING_REVIEW',
            reviewed_by: null,
            reviewed_at: null,
            approved_by: null,
            approved_at: null,
            family: 'CHANGE',
            subtype: 'UPGRADE',
            change: {},
        });

        expect(wrapper.get('[data-testid="signoff-requested-by"]').text()).toContain('Demo Requester A');
        expect(wrapper.get('[data-testid="signoff-reviewed-by"]').text()).toContain('—');
        expect(wrapper.get('[data-testid="signoff-approved-by"]').text()).toContain('—');
    });

    it('AC3: shows the human approver without implying a signed PDF', () => {
        const wrapper = mountShow({ ...BASE, family: 'CHANGE', subtype: 'UPGRADE', change: {} });

        expect(wrapper.get('[data-testid="signoff-approved-by"]').text()).toContain('Demo Approver');
        expect(wrapper.text().toLowerCase()).not.toContain('signed');
    });

    it('AC4: renders every Activation field, collection and site block, keeping 0 and showing a dash for null', () => {
        const wrapper = mountShow({
            ...BASE,
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            activation: {
                customer_name: 'Demo Customer',
                contact_name: 'Demo Contact',
                installation_rfs_date: '2026-10-01',
                lan_ip_allocation: '198.51.100.0/29',
                wan_ip: '192.0.2.10',
                gateway: '192.0.2.1',
                pop: 'Demo POP',
                regional: 'Demo Region',
                preferred_upstream: 'Demo Upstream A',
                secondary_upstream: null,
                primary_noc_link: 'Demo Link 1',
                secondary_noc_link: null,
                downlink_router: 'Demo Router',
                bandwidth_international_mbps: 100.5,
                bandwidth_domestic_iix_mbps: null,
                bandwidth_mixed_mbps: 0,
                domain_name_1: 'example.com',
                domain_name_2: null,
                primary_dns: '192.0.2.53',
                secondary_dns: null,
                mx_primary: '10 mail.example.com',
                mx_secondary: null,
                hosting_platform: 'Demo Hosting',
                hosting_capacity_gb: 50,
                migrate_domain: true,
                migrate_hosting: false,
                references: [{ reference_type: 'IWO', specification: null }],
                service_blocks: [
                    {
                        service_context: 'NEW',
                        service_id: 'SVC-DEMO-1',
                        service_status: 'ACTIVATED',
                        service_description: 'Demo internet',
                        service_location: 'Demo Street 1',
                    },
                ],
                sla_items: [{ row_no: 1, requirement_text: 'Demo SLA' }],
                virtual_connections: [{ row_no: 1, bandwidth_mbps: 25 }],
                priority_destinations: [{ row_no: 1, destination: 'Demo CDN' }],
                direct_site: { latency_ms: 0, packet_loss_percent: 0.5, rssi: null, cable: 'Demo Fiber' },
                pop_site: { vlan_id: 100, port: 'Gi0/1' },
            },
        });

        expect(field(wrapper, 'customer_name')).toBe('Demo Customer');
        expect(field(wrapper, 'gateway')).toBe('192.0.2.1');
        expect(field(wrapper, 'secondary_upstream')).toBe('—');
        expect(field(wrapper, 'bandwidth_international_mbps')).toBe('100.5');
        expect(field(wrapper, 'bandwidth_domestic_iix_mbps')).toBe('—');
        expect(field(wrapper, 'bandwidth_mixed_mbps')).toBe('0');
        expect(field(wrapper, 'mx_primary')).toBe('10 mail.example.com');
        expect(field(wrapper, 'hosting_capacity_gb')).toBe('50');
        expect(field(wrapper, 'migrate_domain')).toBe('Yes');
        expect(field(wrapper, 'migrate_hosting')).toBe('No');
        expect(field(wrapper, 'direct_site.latency_ms')).toBe('0');
        expect(field(wrapper, 'direct_site.rssi')).toBe('—');
        expect(field(wrapper, 'direct_site.cable')).toBe('Demo Fiber');
        expect(field(wrapper, 'pop_site.vlan_id')).toBe('100');
        expect(wrapper.get('[data-testid="table-references"]').text()).toContain('IWO');
        expect(wrapper.get('[data-testid="table-service_blocks"]').text()).toContain('New service');
        expect(wrapper.get('[data-testid="table-service_blocks"]').text()).toContain('Activated');
        expect(wrapper.get('[data-testid="table-sla_items"]').text()).toContain('Demo SLA');
        expect(wrapper.get('[data-testid="table-virtual_connections"]').text()).toContain('25');
        expect(wrapper.get('[data-testid="table-priority_destinations"]').text()).toContain('Demo CDN');
    });

    it('AC4: renders every Change field and collection, including results', () => {
        const wrapper = mountShow({
            ...BASE,
            request_no: 'DEMO-CHG-006',
            family: 'CHANGE',
            subtype: 'UPGRADE',
            change: {
                maintenance_purpose: 'Demo purpose',
                target_execution_date: '2026-10-10',
                monitoring_period_value: 3,
                monitoring_period_unit: 'DAY',
                rollback_scenario: 'Demo rollback',
                announcement_timing: 'ONE_WEEK_BEFORE',
                facing_challenges: [{ row_no: 1, challenge_text: 'Demo challenge' }],
                identified_problems: [{ row_no: 1, problem_text: 'Demo problem' }],
                service_impacts: [
                    { impact_code: 'NOC15', other_description: null },
                    { impact_code: 'OTHER', other_description: 'Demo impact' },
                ],
                improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: 'Error rate 0' }],
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Demo result',
                        performance_information: 'Stable',
                        result_status: 'Done',
                    },
                ],
            },
        });

        expect(field(wrapper, 'maintenance_purpose')).toBe('Demo purpose');
        expect(field(wrapper, 'monitoring_period')).toBe('3 Days');
        expect(field(wrapper, 'announcement_timing')).toBe('1 week before');
        expect(field(wrapper, 'rollback_scenario')).toBe('Demo rollback');
        expect(wrapper.get('[data-testid="table-facing_challenges"]').text()).toContain('Demo challenge');
        expect(wrapper.get('[data-testid="table-identified_problems"]').text()).toContain('Demo problem');
        expect(wrapper.get('[data-testid="table-service_impacts"]').text()).toContain('Demo impact');
        expect(wrapper.get('[data-testid="table-improvement_items"]').text()).toContain('Error rate 0');
        expect(wrapper.get('[data-testid="table-results"]').text()).toContain('Demo result');
    });

    it('shows a dash for an unset monitoring period and "None" for empty collections', () => {
        const wrapper = mountShow({ ...BASE, family: 'CHANGE', subtype: 'MAINTENANCE', change: { results: [] } });

        expect(field(wrapper, 'monitoring_period')).toBe('—');
        expect(wrapper.get('[data-testid="table-results"]').text()).toContain('None');
    });

    it('switches between the tabs; the Timeline needs its own permission', async () => {
        const wrapper = mountShow({ ...BASE, family: 'CHANGE', subtype: 'MAINTENANCE', change: {} });

        await wrapper.get('[data-testid="tab-timeline"]').trigger('click');
        expect(wrapper.text()).toContain('You do not have permission to view this timeline.');
        expect(wrapper.find('[data-testid="form-detail-section"]').exists()).toBe(false);

        await wrapper.get('[data-testid="tab-attachments"]').trigger('click');
        expect(wrapper.text()).toContain('No attachments on this record.');

        await wrapper.get('[data-testid="tab-form"]').trigger('click');
        expect(wrapper.find('[data-testid="form-detail-section"]').exists()).toBe(true);
    });

    it('is read-only: no inputs of any kind', () => {
        const wrapper = mountShow({ ...BASE, family: 'ACTIVATION', subtype: 'ACTIVATION', activation: {} });

        expect(wrapper.findAll('input, select, textarea')).toHaveLength(0);
    });

    it('labels an existing service block and copes with a record that has no form data yet', () => {
        const wrapper = mountShow({
            ...BASE,
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            activation: { service_blocks: [{ service_context: 'EXISTING', service_id: 'SVC-1' }] },
        });

        const services = wrapper.get('[data-testid="table-service_blocks"]').text();
        expect(services).toContain('Existing service');
        expect(services).toContain('—');

        const bare = mountShow({ ...BASE, family: 'ACTIVATION', subtype: 'ACTIVATION' });
        expect(bare.get('[data-testid="field-customer_name"]').text()).toBe('—');

        const bareChange = mountShow({ ...BASE, family: 'CHANGE', subtype: 'MAINTENANCE' });
        expect(bareChange.get('[data-testid="field-maintenance_purpose"]').text()).toBe('—');
    });

    it('FE-34..36: offers the lifecycle actions the server allows on this record', () => {
        resetInertia({ auth: { permissions: ['nscmf.view', 'nscmf.archive'] } });
        const wrapper = mountShow({
            ...BASE,
            allowed_actions: ['nscmf.archive'],
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            activation: {},
        });

        expect(wrapper.get('[data-testid="lifecycle-archive"]').text()).toBe('Archive');
    });

    it('FE-38/43: the Timeline and Attachments tabs show the real panels, not placeholders', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => undefined)),
        );
        resetInertia({ auth: { permissions: ['nscmf.view', 'nscmf.timeline.view'] } });
        const wrapper = mountShow({ ...BASE, family: 'ACTIVATION', subtype: 'ACTIVATION', activation: {} });

        await wrapper.get('[data-testid="tab-timeline"]').trigger('click');
        expect(wrapper.find('[aria-label="Business timeline"]').exists()).toBe(true);
        await wrapper.get('[data-testid="tab-attachments"]').trigger('click');
        expect(wrapper.find('[data-testid="attachments-stub"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('No attachments on this record.');
        vi.unstubAllGlobals();
    });
});
