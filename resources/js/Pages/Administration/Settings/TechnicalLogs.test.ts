import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AppLayout from '@/layouts/AppLayout.vue';
import { resetInertia } from '@/testing/inertia';

import TechnicalLogs from './TechnicalLogs.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const fetchMock = vi.fn();
const SETTING = { automatic_cleanup_enabled: true, retention_value: 30, retention_unit: 'DAY' as const };

function respond(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function mountPage(setting = SETTING) {
    return mount(TechnicalLogs, { props: { setting }, attachTo: document.body });
}

async function save(wrapper: ReturnType<typeof mountPage>): Promise<void> {
    await wrapper.get('[data-testid="settings-save"]').trigger('click');
    await flushPromises();
}

function patches(): unknown[] {
    return fetchMock.mock.calls
        .filter(([, init]) => (init as RequestInit).method === 'PATCH')
        .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

beforeEach(() => {
    document.body.innerHTML = '';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['system.settings.manage'] } });
});
enableAutoUnmount(afterEach);
afterEach(() => vi.unstubAllGlobals());

describe('Technical Log setting (FE-50)', () => {
    it('shows the current server setting without writing anything on open', () => {
        const wrapper = mountPage();

        expect(wrapper.get<HTMLInputElement>('[data-testid="settings-enabled"]').element.checked).toBe(true);
        expect(wrapper.get<HTMLInputElement>('[data-testid="settings-value"]').element.value).toBe('30');
        expect(wrapper.get<HTMLSelectElement>('[data-testid="settings-unit"]').element.value).toBe('DAY');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('AC1: a refusal for anyone but the Protected Superadmin is shown, with no way around it', async () => {
        const wrapper = mountPage();
        respond(403, { code: 'PROTECTED_SUPERADMIN_REQUIRED', message: 'Forbidden.' });
        await save(wrapper);

        expect(wrapper.text()).toContain('Only the Protected Superadmin can change this setting.');
    });

    it('AC2: turning cleanup off keeps the period and warns about storage; the exact wire names are sent', async () => {
        const wrapper = mountPage({ automatic_cleanup_enabled: true, retention_value: 3, retention_unit: 'MONTH' });
        await wrapper.get('[data-testid="settings-enabled"]').setValue(false);
        expect(wrapper.text()).toMatch(/technical logs keep growing/i);
        expect(wrapper.get<HTMLInputElement>('[data-testid="settings-value"]').element.value).toBe('3');

        respond(200, { data: { automatic_cleanup_enabled: false, retention_value: 3, retention_unit: 'MONTH' } });
        await save(wrapper);
        expect(patches()).toEqual([{ automatic_cleanup_enabled: false, retention_value: 3, retention_unit: 'MONTH' }]);
        expect(fetchMock.mock.calls[0]?.[0]).toBe('/administration/settings/technical-logs');
    });

    it('AC3: the period is a whole number of at least 1 day or month', async () => {
        const wrapper = mountPage();
        for (const value of ['0', '1.5', '']) {
            await wrapper.get('[data-testid="settings-value"]').setValue(value);
            await save(wrapper);
            expect(wrapper.text()).toContain('Enter a whole number of 1 or more.');
        }
        expect(fetchMock).not.toHaveBeenCalled();
        expect(
            wrapper.findAll('[data-testid="settings-unit"] option').map((option) => option.attributes('value')),
        ).toEqual(['DAY', 'MONTH']);

        await wrapper.get('[data-testid="settings-value"]').setValue('1');
        respond(422, { code: 'VALIDATION_FAILED', message: 'Invalid.', errors: { retention_value: ['Too large.'] } });
        await save(wrapper);
        expect(wrapper.text()).toContain('Too large.');
    });

    it('AC4: asks for the password when needed and never saves by itself afterwards', async () => {
        const wrapper = mountPage();
        respond(403, { code: 'REAUTH_REQUIRED', message: 'Confirm your current password to continue.' });
        await save(wrapper);
        expect(document.body.textContent).toContain('Confirm');

        respond(200, { data: { reauthenticated: true } });
        const password = document.body.querySelector<HTMLInputElement>('input[type="password"]');
        expect(password).not.toBeNull();
        password!.value = 'secret-password';
        password!.dispatchEvent(new Event('input'));
        document.body.querySelector<HTMLFormElement>('[role="dialog"] form')?.dispatchEvent(new Event('submit'));
        await flushPromises();

        expect(patches()).toHaveLength(1);
        expect(wrapper.text()).toContain('Identity confirmed. Save again to apply the change.');

        respond(200, { data: SETTING });
        await save(wrapper);
        expect(patches()).toHaveLength(2);
        expect(wrapper.text()).toContain('Setting saved.');
        expect(wrapper.text()).not.toMatch(/logs (were|have been) (deleted|purged)/i);
    });

    it('AC5: offers no audit retention, purge-now or other security controls', () => {
        const wrapper = mountPage();

        expect(wrapper.text()).not.toMatch(/purge|audit retention|password policy|mfa|attachment/i);
        expect(wrapper.findAll('input, select').map((field) => field.attributes('data-testid'))).toEqual([
            'settings-enabled',
            'settings-value',
            'settings-unit',
        ]);
    });

    it('is linked in the menu only for the settings permission', () => {
        expect(
            mount(AppLayout, { props: { title: 'x' } })
                .find('a[href="/administration/settings/technical-logs"]')
                .exists(),
        ).toBe(true);
        resetInertia({ auth: { permissions: ['users.view'] } });
        expect(
            mount(AppLayout, { props: { title: 'x' } })
                .find('a[href="/administration/settings/technical-logs"]')
                .exists(),
        ).toBe(false);
    });
});
