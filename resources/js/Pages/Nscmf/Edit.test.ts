import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type JsonResult, sendJson } from '@/lib/http';
import { flashDomainError, pageProps, resetInertia, router } from '@/testing/inertia';

import AttachmentPanel from '@/features/attachments/AttachmentPanel.vue';

import Edit from './Edit.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
vi.mock('@/lib/http', () => ({ sendJson: vi.fn() }));

const send = vi.mocked(sendJson);

function changeRecord(overrides: Partial<NscmfDetailRecord> = {}): NscmfDetailRecord {
    return {
        id: 7,
        request_no: 'OPS-001',
        numbering_mode: 'MANUAL',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        request_date: null,
        business_status: 'DRAFT',
        record_version: 3,
        is_archived: false,
        owner: { id: 9, name: 'Owner' },
        team: { id: 1, name: 'Team A' },
        iteration_no: null,
        allowed_actions: ['edit_draft', 'submit'],
        change: {
            maintenance_purpose: null,
            target_execution_date: null,
            monitoring_period_value: null,
            monitoring_period_unit: null,
            rollback_scenario: 'Restore',
            announcement_timing: null,
            facing_challenges: [],
            identified_problems: [],
            service_impacts: [],
            improvement_items: [],
            results: [],
        },
        ...overrides,
    };
}

function mountEdit(record: NscmfDetailRecord = changeRecord(), warnings: string[] = []): VueWrapper {
    resetInertia({
        auth: { user: { id: 9, username: 'owner', name: 'Owner' }, permissions: ['nscmf.draft.edit', 'nscmf.submit'] },
        errors: {},
    });
    return mount(Edit, { props: { record, warnings }, attachTo: document.body });
}

function reply(result: JsonResult): void {
    send.mockResolvedValueOnce(result);
}

describe('Nscmf/Edit.vue — the Draft editor page (FE-27 composition, BE-062)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        send.mockReset();
    });

    it('composes the three Change sections under the record header', () => {
        const wrapper = mountEdit();

        for (const heading of ['Purpose of changes', 'Schedule and monitoring', 'Result of changes']) {
            expect(wrapper.text()).toContain(heading);
        }
        expect(wrapper.text()).not.toContain('Customer and request');
        expect(wrapper.get('[data-testid="draft-request-no"]').element).toBeInstanceOf(HTMLInputElement);
        expect((wrapper.get('#rollback_scenario').element as HTMLTextAreaElement).value).toBe('Restore');
    });

    it('composes the four Activation sections', () => {
        const wrapper = mountEdit(
            changeRecord({
                family: 'ACTIVATION',
                subtype: 'ACTIVATION',
                change: undefined,
                activation: {
                    customer_name: 'PT A',
                    references: [],
                    service_blocks: [],
                    sla_items: [],
                    virtual_connections: [],
                    priority_destinations: [],
                    direct_site: null,
                    pop_site: null,
                },
            }),
        );

        for (const heading of ['Customer and request', 'Bandwidth', 'NOC configuration', 'Customer site (direct)']) {
            expect(wrapper.text()).toContain(heading);
        }
        expect(wrapper.text()).not.toContain('Purpose of changes');
    });

    it('saves edits and the header as JSON with the acknowledged version, then shows Saved', async () => {
        const wrapper = mountEdit();
        reply({
            ok: true,
            status: 200,
            body: {
                data: { id: 7, record_version: 4, business_status: 'DRAFT', updated_at: 'x' },
                meta: { warnings: [] },
            },
        });

        await wrapper.get('#rollback_scenario').setValue('Restore the old module');
        await wrapper.get('[data-testid="draft-request-date"]').setValue('2026-09-22');
        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();

        expect(send).toHaveBeenCalledWith(
            'PATCH',
            '/nscmf/7/draft',
            expect.objectContaining({
                record_version: 3,
                header: { request_date: '2026-09-22', request_no: 'OPS-001' },
                change: expect.objectContaining({ rollback_scenario: 'Restore the old module' }),
            }),
        );
        expect(wrapper.text()).toContain('Saved');
    });

    it('never sends a request number for an automatic record', async () => {
        const wrapper = mountEdit(changeRecord({ numbering_mode: 'AUTOMATIC', request_no: 'NSCMF-202609-00001' }));
        reply({ ok: true, status: 200, body: { data: { record_version: 4 }, meta: {} } });

        expect(wrapper.find('[data-testid="draft-request-no"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('NSCMF-202609-00001');
        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();

        expect((send.mock.calls[0]?.[2] as { header: Record<string, unknown> }).header).toEqual({ request_date: null });
    });

    it('puts 422 field errors under their fields and keeps the typed value', async () => {
        const wrapper = mountEdit();
        reply({
            ok: false,
            status: 422,
            error: {
                code: 'VALIDATION_FAILED',
                message: 'Some fields need to be corrected.',
                errors: {
                    'change.rollback_scenario': ['Too long.'],
                    'header.request_no': ['This request number is already used.'],
                },
            },
        });

        await wrapper.get('#rollback_scenario').setValue('Mine');
        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('#rollback_scenario-error').text()).toBe('Too long.');
        expect(wrapper.get('#request_no-error').text()).toBe('This request number is already used.');
        expect((wrapper.get('#rollback_scenario').element as HTMLTextAreaElement).value).toBe('Mine');
    });

    it('on 409 keeps the input, pauses saving and only refreshes on an explicit request', async () => {
        const wrapper = mountEdit();
        reply({
            ok: false,
            status: 409,
            error: {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
                context: { latest_record_version: 6 },
            },
        });

        await wrapper.get('#rollback_scenario').setValue('Mine');
        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="feedback-conflict"]').text()).toContain('A newer version exists');
        expect((wrapper.get('#rollback_scenario').element as HTMLTextAreaElement).value).toBe('Mine');
        expect(wrapper.get('[data-testid="submit-button"]').attributes('disabled')).toBeDefined();

        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();
        expect(send).toHaveBeenCalledTimes(1);

        await wrapper.get('[data-testid="feedback-refresh-btn"]').trigger('click');
        expect(router.reload).toHaveBeenCalled();
    });

    it('loads the server state again after a refresh and is clean', async () => {
        const wrapper = mountEdit();
        await wrapper.get('#rollback_scenario').setValue('Mine');

        await wrapper.setProps({
            record: changeRecord({
                record_version: 6,
                change: { ...changeRecord().change, rollback_scenario: 'From server' },
            }),
        });
        await nextTick();

        expect((wrapper.get('#rollback_scenario').element as HTMLTextAreaElement).value).toBe('From server');
        reply({ ok: true, status: 200, body: { data: { record_version: 7 }, meta: {} } });
        await wrapper.get('#rollback_scenario').setValue('Next');
        await wrapper.get('[data-testid="btn-save-draft"]').trigger('click');
        await flushPromises();
        expect((send.mock.calls[0]?.[2] as { record_version: number }).record_version).toBe(6);
    });

    it('blocks Submit while there are unsaved edits and passes server warnings through', async () => {
        const wrapper = mountEdit(changeRecord(), ['No attachment is included.']);

        expect(wrapper.get('[data-testid="warning-summary"]').text()).toContain('No attachment is included.');
        await wrapper.get('#rollback_scenario').setValue('Unsaved');
        expect(wrapper.get('[data-testid="submit-button"]').attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('Save pending changes before submitting');
    });

    it('shows submit validation errors from the page error bag at their fields', async () => {
        const wrapper = mountEdit();

        pageProps.errors = { 'change.identified_problems': 'Add at least one identified problem.' };
        await nextTick();

        expect(wrapper.get('[data-testid="error-summary"]').text()).toContain('Add at least one identified problem.');
    });

    it('shows a flashed submit denial in the submit panel', async () => {
        const wrapper = mountEdit();

        await flashDomainError({ code: 'NSCMF_STATE_CONFLICT', message: 'This record changed.' });

        expect(wrapper.get('[data-testid="domain-error-alert"]').text()).toBe('This record changed.');
    });
});

describe('Nscmf/Edit.vue — attachments (FE-40, FE-43)', () => {
    const policy = { max_files: 10, max_bytes: 20_000_000, chunk_bytes: 5_242_880, extensions: ['pdf'] };

    function mountWithAttachments(permissions: string[], record: NscmfDetailRecord = changeRecord()): VueWrapper {
        resetInertia({ auth: { user: { id: 9, username: 'owner', name: 'Owner' }, permissions }, errors: {} });
        return mount(Edit, {
            props: { record, warnings: [], attachments: [], attachment_policy: policy },
            attachTo: document.body,
        });
    }

    beforeEach(() => {
        document.body.innerHTML = '';
        send.mockReset();
    });

    it('lets the owner with attachment permission add files to an editable record', () => {
        const wrapper = mountWithAttachments(['nscmf.draft.edit', 'nscmf.attachment.manage']);

        expect(wrapper.get<HTMLInputElement>('[data-testid="attachment-input"]').element.disabled).toBe(false);
    });

    it('offers no upload without the permission or to someone other than the owner', () => {
        expect(mountWithAttachments(['nscmf.draft.edit']).find('[data-testid="attachment-input"]').exists()).toBe(
            false,
        );
        expect(
            mountWithAttachments(
                ['nscmf.draft.edit', 'nscmf.attachment.manage'],
                changeRecord({ owner: { id: 2, name: 'Someone else' } }),
            )
                .find('[data-testid="attachment-input"]')
                .exists(),
        ).toBe(false);
    });

    it('asks to save unsaved form changes before changing attachments', async () => {
        const wrapper = mountWithAttachments(['nscmf.draft.edit', 'nscmf.attachment.manage']);
        await wrapper.get('#rollback_scenario').setValue('Restore the old module');

        expect(wrapper.get<HTMLInputElement>('[data-testid="attachment-input"]').element.disabled).toBe(true);
        expect(wrapper.text()).toContain('Save your changes before adding or removing attachments.');
    });

    it('reloads the record after an attachment change, since it moves the record version', async () => {
        const wrapper = mountWithAttachments(['nscmf.draft.edit', 'nscmf.attachment.manage']);
        router.reload.mockClear();
        wrapper.getComponent(AttachmentPanel).vm.$emit('changed');
        await nextTick();

        expect(router.reload).toHaveBeenCalledWith();
    });
});

/*
 * Revision Edit (07 §12 screen 9; FE-28: "Revision menampilkan alasan return"): the requester
 * revises because of a reason, so the editor shows the reason of the latest return to
 * REVISION_REQUIRED. The reason lives in the Business Timeline (07 §36; 12 §33).
 */
describe('Nscmf/Edit.vue — the return reason in Revision mode', () => {
    const event = (id: number, to_status: string | null, reason: string | null) => ({
        id,
        event_type: to_status === null ? 'DRAFT_SAVED' : 'REVIEW_RETURNED',
        actor: 'Reviewer',
        iteration_no: 1,
        from_status: null,
        to_status,
        reason,
        comment: null,
        version_before: null,
        version_after: null,
        occurred_at: '2026-09-24T10:00:00+07:00',
        changes: [],
    });
    const page = (data: ReturnType<typeof event>[], current: number, last: number) => ({
        ok: true as const,
        status: 200,
        body: { data, meta: { current_page: current, last_page: last, total: data.length } },
    });

    function mountRevision(permissions: string[]): VueWrapper {
        resetInertia({ auth: { user: { id: 9, username: 'owner', name: 'Owner' }, permissions }, errors: {} });
        return mount(Edit, {
            props: { record: changeRecord({ business_status: 'REVISION_REQUIRED', iteration_no: 1 }), warnings: [] },
            attachTo: document.body,
        });
    }

    beforeEach(() => {
        document.body.innerHTML = '';
        send.mockReset();
    });

    it('shows the reason of the latest return, even when later saves pushed it to an older page', async () => {
        reply(page([event(9, null, null), event(8, null, null)], 1, 2));
        reply(
            page(
                [
                    event(7, 'REVISION_REQUIRED', 'Fix the rollback steps.'),
                    event(3, 'REVISION_REQUIRED', 'Old reason.'),
                ],
                2,
                2,
            ),
        );

        const wrapper = mountRevision(['nscmf.draft.edit', 'nscmf.submit', 'nscmf.timeline.view']);
        await flushPromises();

        const notice = wrapper.get('[data-testid="revision-notice"]').text();
        expect(notice).toContain('Fix the rollback steps.');
        expect(notice).not.toContain('Old reason.');
        expect(send.mock.calls.map((call) => [call[0], call[1]])).toEqual([
            ['GET', '/nscmf/7/timeline?page=1&per_page=25'],
            ['GET', '/nscmf/7/timeline?page=2&per_page=25'],
        ]);
    });

    it('still marks Revision mode, without asking, when the actor may not read the timeline', async () => {
        const wrapper = mountRevision(['nscmf.draft.edit', 'nscmf.submit']);
        await flushPromises();

        expect(wrapper.get('[data-testid="revision-notice"]').text()).toContain('Revision Required');
        expect(send).not.toHaveBeenCalled();
    });

    it('never asks for a reason while editing a Draft', async () => {
        resetInertia({
            auth: { user: { id: 9, username: 'owner', name: 'Owner' }, permissions: ['nscmf.timeline.view'] },
            errors: {},
        });
        mount(Edit, { props: { record: changeRecord(), warnings: [] }, attachTo: document.body });
        await flushPromises();

        expect(send).not.toHaveBeenCalled();
    });
});
