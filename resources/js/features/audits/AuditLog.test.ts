import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppLayout from '@/layouts/AppLayout.vue';
import { lastRequest, requests, resetInertia } from '@/testing/inertia';

import AuditLog, { type AuditQuery } from './AuditLog.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const QUERY: AuditQuery = {
    page: 1,
    per_page: 25,
    event_type: null,
    actor_user_id: null,
    occurred_from: null,
    occurred_to: null,
    outcome: null,
};
const META = { current_page: 1, last_page: 2, per_page: 25, total: 30 };

function mountLog(kind: 'access' | 'security', items: Record<string, unknown>[], query: Partial<AuditQuery> = {}) {
    return mount(AuditLog, { props: { kind, items, meta: META, query: { ...QUERY, ...query } } });
}

const ACCESS_ITEM = {
    id: 1,
    event_type: 'RECORD_VIEWED',
    occurred_at: '2026-09-24T08:15:00+07:00',
    actor: { id: 3, name: 'Demo Reviewer' },
    record: { id: 9, request_no: 'DEMO-ACT-009' },
    attachment_id: null,
    export_request_id: null,
};

const SECURITY_ITEM = {
    id: 2,
    event_type: 'LOGIN_FAILED',
    outcome: 'FAILURE',
    occurred_at: '2026-09-24T08:15:00+07:00',
    actor: null,
    target: null,
    subject_username: 'someone',
    ip_address: '192.0.2.10',
    record_id: null,
};

function texts(wrapper: VueWrapper, selector: string): string[] {
    return wrapper.findAll(selector).map((node) => node.text());
}

beforeEach(() => resetInertia({ auth: { permissions: ['audit.access.view', 'audit.security.view'] } }));

describe('Privileged audit viewers (FE-39)', () => {
    it('AC1: each viewer navigates only its own endpoint, and the menu follows each permission', async () => {
        const access = mountLog('access', [ACCESS_ITEM]);
        await access.get('[data-testid="audit-filter-event"]').setValue('RECORD_VIEWED');
        expect(lastRequest('/administration/audits/access')?.data).toEqual({
            page: 1,
            per_page: 25,
            event_type: 'RECORD_VIEWED',
        });
        expect(requests.every((request) => request.url === '/administration/audits/access')).toBe(true);
        expect(access.find('[data-testid="audit-filter-outcome"]').exists()).toBe(false);

        resetInertia({ auth: { permissions: ['audit.access.view'] } });
        const layout = mount(AppLayout, { props: { title: 'x' } });
        expect(layout.find('a[href="/administration/audits/access"]').exists()).toBe(true);
        expect(layout.find('a[href="/administration/audits/security"]').exists()).toBe(false);
    });

    it('AC1: the security viewer offers its outcome filter and security event types', async () => {
        const wrapper = mountLog('security', [SECURITY_ITEM]);
        expect(texts(wrapper, '[data-testid="audit-filter-event"] option')).toContain('Login failed');
        expect(texts(wrapper, '[data-testid="audit-filter-event"] option')).not.toContain('Record viewed');

        await wrapper.get('[data-testid="audit-filter-outcome"]').setValue('FAILURE');
        expect(lastRequest('/administration/audits/security')?.data).toMatchObject({ outcome: 'FAILURE', page: 1 });
    });

    it('AC2: is read-only: no delete, purge, retention or export control', () => {
        const wrapper = mountLog('security', [SECURITY_ITEM]);

        expect(wrapper.text()).not.toMatch(/delete|purge|retention|export|clear log/i);
        expect(texts(wrapper, 'button')).toEqual(['Previous', 'Next']);
    });

    it('AC3: renders only the approved fields, never an unexpected secret', () => {
        const wrapper = mountLog('security', [
            { ...SECURITY_ITEM, temporary_password: 'Tmp-S3cret!', token: 'abc.def', metadata_json: '{"key":"k"}' },
        ]);

        const html = wrapper.html();
        expect(html).not.toContain('Tmp-S3cret!');
        expect(html).not.toContain('abc.def');
        expect(html).not.toContain('"key"');
        expect(wrapper.text()).toContain('someone');
        expect(wrapper.text()).toContain('2026-09-24 08:15 WIB');
    });

    it('AC3: shows the access fields with a link to the record', () => {
        const wrapper = mountLog('access', [ACCESS_ITEM]);

        expect(wrapper.text()).toContain('Record viewed');
        expect(wrapper.text()).toContain('Demo Reviewer');
        expect(wrapper.get('a[href="/nscmf/9"]').text()).toBe('DEMO-ACT-009');
    });

    it('AC4: an empty authorized result says so; date filters are sent as typed', async () => {
        const wrapper = mountLog('access', []);
        expect(wrapper.text()).toContain('No audit events match these filters.');

        await wrapper.get('[data-testid="audit-filter-from"]').setValue('2026-09-01');
        expect(lastRequest('/administration/audits/access')?.data).toEqual({
            page: 1,
            per_page: 25,
            occurred_from: '2026-09-01',
        });
    });

    it('pages through the server result', async () => {
        const wrapper = mountLog('access', [ACCESS_ITEM], { event_type: 'RECORD_VIEWED' });
        await wrapper.get('[data-testid="audit-next"]').trigger('click');

        expect(lastRequest('/administration/audits/access')?.data).toEqual({
            page: 2,
            per_page: 25,
            event_type: 'RECORD_VIEWED',
        });
    });
});
