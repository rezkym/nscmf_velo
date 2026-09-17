import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import Show from './Show.vue';

// Mock Inertia
vi.mock('@inertiajs/vue3', () => ({
    Head: {
        props: ['title'],
        template: '<head><title>{{ title }}</title></head>',
    },
    Link: {
        props: ['href'],
        template: '<a :href="href"><slot /></a>',
    },
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, username: 'tester', name: 'Tester' },
                permissions: ['nscmf.view'],
            },
        },
    }),
}));

describe('Pages/Nscmf/Show.vue (FE-18)', () => {
    it('AC1 — detail_separates_archived_and_business_status: APPROVED+is_archived tetap APPROVED bukan ARCHIVED enum', () => {
        const record = {
            id: 101,
            request_no: 'NSCMF-202609-00101',
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            request_date: '2026-09-17',
            business_status: 'APPROVED',
            record_version: 3,
            is_archived: true,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            created_at: '2026-09-17T09:00:00+07:00',
            updated_at: '2026-09-17T10:00:00+07:00',
            requested_by: { id: 1, name: 'Budi Santoso' },
            first_submitted_at: '2026-09-17T09:10:00+07:00',
            reviewed_by: { id: 2, name: 'Dewi Reviewer' },
            reviewed_at: '2026-09-17T09:30:00+07:00',
            approved_by: { id: 3, name: 'Agus Approver' },
            approved_at: '2026-09-17T09:55:00+07:00',
            activation: {
                customer_name: 'PT Telco Sejahtera',
                contact_name: 'Bapak Ahmad',
            },
        };

        const wrapper = mount(Show, {
            props: { record },
        });

        // Business status badge MUST display "Approved" or "APPROVED"
        const businessStatusBadge = wrapper.find('[data-testid="business-status-badge"]');
        expect(businessStatusBadge.exists()).toBe(true);
        expect(businessStatusBadge.text()).toMatch(/Approved/i);
        // It must NOT be converted to "ARCHIVED" as business status
        expect(businessStatusBadge.text()).not.toMatch(/Archived/i);

        // Separate archived badge MUST be present
        const archivedBadge = wrapper.find('[data-testid="archived-badge"]');
        expect(archivedBadge.exists()).toBe(true);
        expect(archivedBadge.text()).toMatch(/Archived/i);

        // Header identity
        expect(wrapper.find('[data-testid="request-no"]').text()).toContain('NSCMF-202609-00101');
        expect(wrapper.find('[data-testid="family-subtype"]').text()).toContain('ACTIVATION');
        expect(wrapper.find('[data-testid="owner-name"]').text()).toContain('Budi Santoso');
        expect(wrapper.find('[data-testid="team-name"]').text()).toContain('Core Network');
        expect(wrapper.find('[data-testid="record-version"]').text()).toContain('3');
    });

    it('AC2 — detail_uses_effective_signoffs: approver return mengosongkan ReviewedBy efektif tetapi history tetap event lama', () => {
        // When approver returns the record, server clears effective reviewed_by_user_id / reviewed_at in iteration
        const record = {
            id: 102,
            request_no: 'NSCMF-202609-00102',
            family: 'CHANGE',
            subtype: 'MAINTENANCE',
            business_status: 'PENDING_REVIEW',
            record_version: 5,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            requested_by: { id: 1, name: 'Budi Santoso' },
            first_submitted_at: '2026-09-17T09:10:00+07:00',
            reviewed_by: null, // Cleared on approver return
            reviewed_at: null, // Cleared on approver return
            approved_by: null,
            approved_at: null,
            change: {
                maintenance_purpose: 'Firmware upgrade',
            },
        };

        const wrapper = mount(Show, {
            props: { record },
        });

        const requestedBySection = wrapper.find('[data-testid="signoff-requested-by"]');
        expect(requestedBySection.text()).toContain('Budi Santoso');

        const reviewedBySection = wrapper.find('[data-testid="signoff-reviewed-by"]');
        // Effective reviewed_by is null/empty, must show neutral indicator (e.g. "-" or "Pending" or "Not reviewed")
        expect(reviewedBySection.text()).not.toContain('Budi Santoso');
        expect(reviewedBySection.text()).toMatch(/—|-|None|Not reviewed|Pending/i);

        const approvedBySection = wrapper.find('[data-testid="signoff-approved-by"]');
        expect(approvedBySection.text()).toMatch(/—|-|None|Not approved|Pending/i);
    });

    it('AC3 — detail_does_not_infer_signer: human ApprovedBy bukan signature status dan tidak otomatis PDF signed', () => {
        const record = {
            id: 103,
            request_no: 'NSCMF-202609-00103',
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            business_status: 'APPROVED',
            record_version: 4,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            requested_by: { id: 1, name: 'Budi Santoso' },
            first_submitted_at: '2026-09-17T09:10:00+07:00',
            reviewed_by: { id: 2, name: 'Dewi Reviewer' },
            reviewed_at: '2026-09-17T09:30:00+07:00',
            approved_by: { id: 3, name: 'Agus Approver' },
            approved_at: '2026-09-17T09:55:00+07:00',
            activation: {
                customer_name: 'PT Telco Sejahtera',
            },
        };

        const wrapper = mount(Show, {
            props: { record },
        });

        // Human ApprovedBy is shown
        const approvedBySection = wrapper.find('[data-testid="signoff-approved-by"]');
        expect(approvedBySection.text()).toContain('Agus Approver');

        // Must NOT infer or display that digital signature / PDF is signed or certificate issued
        const signatureStatus = wrapper.find('[data-testid="digital-signature-status"]');
        expect(signatureStatus.exists()).toBe(false);

        // Check text content across the whole view does not claim "PDF Signed" or "Digitally Signed by Agus Approver"
        expect(wrapper.text()).not.toMatch(/PDF Signed/i);
        expect(wrapper.text()).not.toMatch(/Digitally Signed by Agus/i);
    });

    it('AC4 — detail_renders_both_families: semua field collections/sites/results dari 05_FORM_CONTRACTS tampil sesuai data; null tidak jadi 0', () => {
        // Test Activation family with collections and direct_site/pop_site
        const activationRecord = {
            id: 104,
            request_no: 'NSCMF-202609-00104',
            family: 'ACTIVATION',
            subtype: 'UPGRADE_DOWNGRADE',
            business_status: 'APPROVED',
            record_version: 2,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            activation: {
                customer_name: 'PT Maju Mundur',
                contact_name: 'Ibu Siti',
                installation_rfs_date: '2026-10-01',
                bandwidth_international_mbps: 100.5,
                bandwidth_domestic_iix_mbps: null, // Must remain neutral, NOT 0
                references: [
                    { reference_type: 'IWO', specification: 'IWO-9988' },
                    { reference_type: 'OTHER', specification: 'Custom ref note' },
                ],
                service_blocks: [
                    {
                        service_context: 'EXISTING',
                        service_id: 'SVC-100',
                        service_status: 'ACTIVATED',
                        service_description: 'Old 50Mbps link',
                        service_location: 'Gedung A Lt 3',
                    },
                    {
                        service_context: 'NEW',
                        service_id: 'SVC-101',
                        service_status: 'ACTIVATED',
                        service_description: 'New 100Mbps link',
                        service_location: 'Gedung A Lt 4',
                    },
                ],
                sla_items: [{ row_no: 1, requirement_text: 'SLA 99.9% uptime' }],
                virtual_connections: [{ row_no: 1, bandwidth_mbps: 50 }],
                priority_destinations: [{ row_no: 1, destination: 'IXP Singapore' }],
                direct_site: {
                    latency_ms: 0, // 0 must survive and be displayed as 0, not empty or null!
                    packet_loss_percent: 0,
                    rssi: null, // Null must NOT be displayed as 0!
                    routers: 'Cisco ASR 9000',
                },
                pop_site: {
                    vlan_id: 1024,
                    port: 'Te0/0/1',
                },
            },
        };

        const wrapperActivation = mount(Show, {
            props: { record: activationRecord },
        });

        // Ensure fields render correctly
        expect(wrapperActivation.find('[data-testid="activation-customer-name"]').text()).toContain('PT Maju Mundur');
        expect(wrapperActivation.find('[data-testid="activation-contact-name"]').text()).toContain('Ibu Siti');
        expect(wrapperActivation.find('[data-testid="activation-bw-intl"]').text()).toContain('100.5');

        // Domestic IIX was null: must display "-" or neutral symbol, NEVER "0"
        const domBw = wrapperActivation.find('[data-testid="activation-bw-dom"]');
        expect(domBw.text()).toMatch(/—|-|None/i);
        expect(domBw.text()).not.toBe('0');

        // direct_site latency_ms was 0: must display "0" (zero survived)
        const latency = wrapperActivation.find('[data-testid="direct-site-latency"]');
        expect(latency.text()).toContain('0');

        // direct_site rssi was null: must display neutral, NOT "0"
        const rssi = wrapperActivation.find('[data-testid="direct-site-rssi"]');
        expect(rssi.text()).toMatch(/—|-|None/i);
        expect(rssi.text()).not.toBe('0');

        // Test Change family with results and impacts
        const changeRecord = {
            id: 105,
            request_no: 'NSCMF-202609-00105',
            family: 'CHANGE',
            subtype: 'EMERGENCY',
            business_status: 'APPROVED',
            record_version: 7,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            change: {
                maintenance_purpose: 'Emergency link reroute',
                target_execution_date: '2026-09-18',
                monitoring_period_value: 24,
                monitoring_period_unit: 'HOUR',
                rollback_scenario: 'Revert BGP routes to secondary ISP',
                announcement_timing: 'TWO_DAYS_BEFORE_EMERGENCY',
                facing_challenges: [{ row_no: 1, challenge_text: 'High traffic volume' }],
                identified_problems: [{ row_no: 1, problem_text: 'Fiber cut at segment C' }],
                service_impacts: [
                    { impact_code: 'NOC15', other_description: null },
                    { impact_code: 'OTHER', other_description: 'VIP Enterprise client' },
                ],
                improvement_items: [
                    {
                        row_no: 1,
                        plan_text: 'Splice fiber cable core 12',
                        target_kpi: 'Loss < 0.2dB',
                    },
                ],
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Fiber spliced successfully',
                        performance_information: 'Signal level -18dBm',
                        result_status: 'SUCCESSFUL',
                    },
                ],
            },
        };

        const wrapperChange = mount(Show, {
            props: { record: changeRecord },
        });

        expect(wrapperChange.find('[data-testid="change-purpose"]').text()).toContain('Emergency link reroute');
        expect(wrapperChange.find('[data-testid="change-rollback"]').text()).toContain('Revert BGP routes');
        expect(wrapperChange.find('[data-testid="change-results"]').text()).toContain('Fiber spliced successfully');
        expect(wrapperChange.find('[data-testid="change-results"]').text()).toContain('SUCCESSFUL');
    });

    it('renders tabs and handles unavailable Timeline/Attachments with neutral read-only stubs', () => {
        const record = {
            id: 106,
            request_no: 'NSCMF-202609-00106',
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            business_status: 'DRAFT',
            record_version: 1,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            activation: {
                customer_name: 'PT Test',
            },
        };

        const wrapper = mount(Show, {
            props: { record },
        });

        // Tabs exist
        const tabs = wrapper.findAll('[role="tab"]');
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        // Form Detail tab is active by default
        expect(wrapper.find('[data-testid="form-detail-section"]').exists()).toBe(true);

        // Click Timeline tab
        const timelineTab = tabs.find((t) => t.text().includes('Timeline'));
        expect(timelineTab?.exists()).toBe(true);
        timelineTab?.trigger('click');

        // Timeline tab shows unavailable/read-only stub without fake evidence
        const timelineSection = wrapper.find('[data-testid="timeline-stub"]');
        expect(timelineSection.exists()).toBe(true);
        expect(timelineSection.text()).toMatch(/Timeline history unavailable|Timeline view is not available/i);

        // Click Attachments tab
        const attachmentsTab = tabs.find((t) => t.text().includes('Attachments'));
        expect(attachmentsTab?.exists()).toBe(true);
        attachmentsTab?.trigger('click');

        // Attachments tab shows unavailable/read-only stub without fake evidence
        const attachmentsSection = wrapper.find('[data-testid="attachments-stub"]');
        expect(attachmentsSection.exists()).toBe(true);
        expect(attachmentsSection.text()).toMatch(/Attachments unavailable|Attachments are not available/i);
    });

    it('does not mount editable inputs in readonly view', () => {
        const record = {
            id: 107,
            request_no: 'NSCMF-202609-00107',
            family: 'ACTIVATION',
            subtype: 'ACTIVATION',
            business_status: 'APPROVED',
            record_version: 1,
            is_archived: false,
            owner: { id: 1, name: 'Budi Santoso' },
            team: { id: 10, name: 'Core Network' },
            activation: {
                customer_name: 'PT Read Only',
                contact_name: 'Pak Doni',
            },
        };

        const wrapper = mount(Show, {
            props: { record },
        });

        // Read-only view must NOT mount input, select, textarea editable elements
        expect(wrapper.findAll('input').length).toBe(0);
        expect(wrapper.findAll('select').length).toBe(0);
        expect(wrapper.findAll('textarea').length).toBe(0);
    });
});
