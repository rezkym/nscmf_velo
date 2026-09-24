import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flashDomainError, forms, lastRequest, requests, resetInertia } from '@/testing/inertia';

import { type Team } from '@/features/administration/TeamManager.vue';

import Index from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const teams: Team[] = [
    { id: 1, name: 'Demo Team Alpha', is_active: true },
    { id: 2, name: 'Demo Team Beta', is_active: false },
];

const ALL_TEAM_PERMISSIONS = ['teams.view', 'teams.create', 'teams.update', 'teams.archive'];

function mountPage(permissions: string[] = ALL_TEAM_PERMISSIONS, teamList: Team[] = teams): VueWrapper {
    resetInertia({ auth: { user: { id: 9, username: 'admin', name: 'Admin' }, permissions } });
    return mount(Index, { props: { teams: teamList }, attachTo: document.body });
}

function nameForm() {
    const form = forms.find((candidate) => 'name' in candidate);
    if (!form) throw new Error('team name form was not created');
    return form;
}

describe('Team administration (FE-11)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders inside the authenticated shell and lists teams with their status', () => {
        const wrapper = mountPage();

        expect(wrapper.find('nav[aria-label="Sidebar Menu"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="team-row-1"]').text()).toContain('Demo Team Alpha');
        expect(wrapper.find('[data-testid="team-row-1"]').text()).toContain('Active');
        expect(wrapper.find('[data-testid="team-row-2"]').text()).toContain('Inactive');
    });

    it('shows an empty state when no teams exist', () => {
        expect(mountPage(ALL_TEAM_PERMISSIONS, []).text()).toContain('No teams yet.');
    });

    it('hides create, edit and lifecycle actions without the matching permissions', () => {
        const wrapper = mountPage(['teams.view']);

        expect(wrapper.find('[data-testid="create-team-btn"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="edit-team-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="deactivate-team-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="reactivate-team-2"]').exists()).toBe(false);
    });

    it('AC1: creates a team with only a name — no scope, permission or code fields', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-team-btn"]').trigger('click');

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.findAll('input, select, textarea')).toHaveLength(1);
        expect(dialog.get('input').attributes('maxlength')).toBe('150');

        await dialog.get('input').setValue('Demo Team Gamma');
        await dialog.get('form').trigger('submit');

        expect(lastRequest('/administration/teams')).toMatchObject({
            method: 'post',
            data: { name: 'Demo Team Gamma' },
        });
    });

    it('edits a team name with PATCH and closes the modal on success', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="edit-team-1"]').trigger('click');

        const input = wrapper.get<HTMLInputElement>('[role="dialog"] input');
        expect(input.element.value).toBe('Demo Team Alpha');
        await input.setValue('Demo Team Alpha Renamed');
        await wrapper.get('[role="dialog"] form').trigger('submit');

        const request = lastRequest('/administration/teams/1');
        expect(request).toMatchObject({ method: 'patch', data: { name: 'Demo Team Alpha Renamed' } });

        request?.options.onSuccess?.();
        await flushPromises();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('AC3: keeps the modal open and shows the server error next to the name field', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-team-btn"]').trigger('click');

        nameForm().errors = { name: 'The name has already been taken.' };
        await nextTick();

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.get('[role="alert"]').text()).toBe('The name has already been taken.');
        expect(dialog.get('input').attributes('aria-describedby')).toContain('team-name-error');
    });

    it('does not submit twice while a save is in flight', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-team-btn"]').trigger('click');
        await wrapper.get('[role="dialog"] input').setValue('Demo Team Gamma');

        nameForm().processing = true;
        await nextTick();
        await wrapper.get('[role="dialog"] form').trigger('submit');

        expect(requests).toHaveLength(0);
        expect(wrapper.get('[data-testid="save-team-btn"]').attributes('disabled')).toBeDefined();
    });

    it('closes the modal with Escape without submitting', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-team-btn"]').trigger('click');
        await nextTick();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await flushPromises();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(requests).toHaveLength(0);
    });

    it('AC2: deactivates an active team through its lifecycle endpoint once, after confirmation', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.text()).toContain('does not change who can review or approve');

        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        expect(requests).toHaveLength(1);
        const request = lastRequest('/administration/teams/1/deactivate');
        expect(request?.method).toBe('post');

        request?.options.onSuccess?.();
        request?.options.onFinish?.();
        await flushPromises();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('AC2: reactivates an inactive team through its lifecycle endpoint', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="reactivate-team-2"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        expect(lastRequest('/administration/teams/2/reactivate')?.method).toBe('post');
    });

    it('keeps the lifecycle dialog open and shows the server error when the action fails', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        const request = lastRequest('/administration/teams/1/deactivate');
        await flashDomainError({ code: 'FORBIDDEN', message: 'This team cannot be deactivated.' });
        request?.options.onFinish?.();
        await nextTick();

        expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toBe('This team cannot be deactivated.');
        expect(wrapper.get('[data-testid="confirm-lifecycle-action"]').attributes('disabled')).toBeUndefined();
    });

    it('shows the server error when the flash arrives on the page root instead of the props', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        const request = lastRequest('/administration/teams/1/deactivate');
        // The installed @inertiajs/core puts flash at Page.flash; this page must not depend on the
        // server also sharing a flash prop, because only one of the two will actually arrive.
        await flashDomainError({ code: 'FORBIDDEN', message: 'This team cannot be deactivated.' }, 'page');
        request?.options.onFinish?.();
        await nextTick();

        expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toBe('This team cannot be deactivated.');
    });

    it('keeps the lifecycle dialog open while the action is in flight', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });

        expect(wrapper.find('[data-testid="confirm-lifecycle-action"]').exists()).toBe(true);
    });

    it('closes the lifecycle dialog when the server accepts the action', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        lastRequest(/deactivate$/)?.options.onSuccess?.();
        await nextTick();

        expect(wrapper.find('[data-testid="confirm-lifecycle-action"]').exists()).toBe(false);
    });

    it('keeps the dialog open when the redirect carries a domain error, and falls back to its own wording', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="deactivate-team-1"]').trigger('click');
        await wrapper.get('[data-testid="confirm-lifecycle-action"]').trigger('click');

        await flashDomainError({ code: 'FORBIDDEN' });
        lastRequest(/deactivate$/)?.options.onSuccess?.();
        await nextTick();

        expect(wrapper.get('[role="dialog"]').text()).toContain('The team could not be updated.');
        expect(wrapper.find('[data-testid="confirm-lifecycle-action"]').exists()).toBe(true);
    });
});
