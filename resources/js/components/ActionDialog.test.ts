import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ActionDialog from './ActionDialog.vue';

describe('ActionDialog (FE-04)', () => {
    it('AC1: dialog_requires_reason_when_required — reason " " dan 4 chars tidak confirm; 5 meaningful diterima; 2001 ditolak', async () => {
        const wrapper = mount(ActionDialog, {
            props: {
                open: true,
                title: 'Reject Request',
                requestNo: 'REQ-2026-001',
                reasonRequired: true,
            },
        });

        const textarea = wrapper.find('textarea');
        const confirmBtn = wrapper.find('[data-test="confirm-button"]');

        // Initial click with empty reason
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeUndefined();

        // Whitespace only: '   '
        await textarea.setValue('   ');
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeUndefined();
        expect(wrapper.text()).toContain('Reason is required');

        // 4 chars: 'abcd'
        await textarea.setValue('abcd');
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeUndefined();
        expect(wrapper.text()).toContain('Reason must be at least 5 characters');

        // 2001 chars
        await textarea.setValue('a'.repeat(2001));
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeUndefined();
        expect(wrapper.text()).toContain('Reason cannot exceed 2000 characters');

        // 5 meaningful chars: 'valid reason'
        await textarea.setValue('valid reason');
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
        expect(wrapper.emitted('confirm')?.[0]).toEqual([{ reason: 'valid reason' }]);
    });

    it('AC2: dialog_optional_comment_can_be_empty — approve/forward boleh kosong tanpa mengubah aturan return', async () => {
        const wrapper = mount(ActionDialog, {
            props: {
                open: true,
                title: 'Approve Request',
                requestNo: 'REQ-2026-001',
                reasonRequired: false,
            },
        });

        const confirmBtn = wrapper.find('[data-test="confirm-button"]');
        const textarea = wrapper.find('textarea');

        // Empty reason/comment when not required should submit successfully
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')).toBeTruthy();
        expect(wrapper.emitted('confirm')?.[0]).toEqual([{ reason: '' }]);

        // But exceeding 2000 chars is still rejected
        await textarea.setValue('a'.repeat(2001));
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')?.length).toBe(1);
        expect(wrapper.text()).toContain('Comment cannot exceed 2000 characters');
    });

    it('AC3: dialog_submits_once_while_pending — double click hanya satu event; error tetap tampil dan reason tidak hilang', async () => {
        const wrapper = mount(ActionDialog, {
            props: {
                open: true,
                title: 'Reject Request',
                requestNo: 'REQ-2026-001',
                reasonRequired: true,
                pending: false,
                error: 'Network failure during reject',
            },
        });

        // Error is visible persistently in context
        expect(wrapper.find('[role="alert"]').text()).toContain('Network failure during reject');

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Valid rejection reason');

        const confirmBtn = wrapper.find('[data-test="confirm-button"]');
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')?.length).toBe(1);

        // When pending is true
        await wrapper.setProps({ pending: true });
        await confirmBtn.trigger('click');
        await confirmBtn.trigger('click');
        expect(wrapper.emitted('confirm')?.length).toBe(1);

        // Reason input preserved
        expect((textarea.element as HTMLTextAreaElement).value).toBe('Valid rejection reason');
    });

    it('AC4: dialog_restores_focus — keyboard cancel mengembalikan fokus tanpa event confirm', async () => {
        const trigger = document.createElement('button');
        trigger.id = 'trigger-btn';
        document.body.appendChild(trigger);
        trigger.focus();
        expect(document.activeElement).toBe(trigger);

        const wrapper = mount(ActionDialog, {
            attachTo: document.body,
            props: {
                open: true,
                title: 'Return Request',
                requestNo: 'REQ-2026-001',
                triggerElement: trigger,
            },
        });

        const cancelBtn = wrapper.find('[data-test="cancel-button"]');
        await cancelBtn.trigger('click');

        expect(wrapper.emitted('cancel')).toBeTruthy();
        expect(wrapper.emitted('confirm')).toBeUndefined();

        await wrapper.setProps({ open: false });
        expect(document.activeElement).toBe(trigger);

        // Re-open and cancel with Escape key
        await wrapper.setProps({ open: true });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(wrapper.emitted('cancel')?.length).toBe(2);

        await wrapper.setProps({ open: false });
        expect(document.activeElement).toBe(trigger);

        wrapper.unmount();
        document.body.removeChild(trigger);
    });

    it('traps Tab focus inside the dialog per microtask_fe/FE-04.md ("trap fokus")', () => {
        const wrapper = mount(ActionDialog, {
            attachTo: document.body,
            props: {
                open: true,
                title: 'Reject Request',
                requestNo: 'REQ-2026-001',
                reasonRequired: true,
            },
        });

        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
        const confirmBtn = wrapper.find('[data-test="confirm-button"]').element as HTMLButtonElement;

        // Tab forward from the last focusable element wraps back to the first
        confirmBtn.focus();
        expect(document.activeElement).toBe(confirmBtn);
        const forwardEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        window.dispatchEvent(forwardEvent);
        expect(document.activeElement).toBe(textarea);
        expect(forwardEvent.defaultPrevented).toBe(true);

        // Shift+Tab from the first focusable element wraps to the last
        textarea.focus();
        expect(document.activeElement).toBe(textarea);
        const backwardEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(backwardEvent);
        expect(document.activeElement).toBe(confirmBtn);
        expect(backwardEvent.defaultPrevented).toBe(true);

        wrapper.unmount();
    });

    it('shows the request number, the consequence and the destination when given', () => {
        const wrapper = mount(ActionDialog, {
            props: {
                open: true,
                title: 'Forward for approval',
                requestNo: 'DEMO-ACT-005',
                consequence: 'The record moves to Pending Approval.',
                destination: 'Approver pool',
            },
        });

        const text = wrapper.text();
        expect(text).toContain('DEMO-ACT-005');
        expect(text).toContain('The record moves to Pending Approval.');
        expect(text).toContain('Approver pool');
    });

    it('omits the request number line when there is none', () => {
        const wrapper = mount(ActionDialog, { props: { open: true, title: 'Cancel record' } });

        expect(wrapper.text()).not.toContain('Request No:');
    });
});
