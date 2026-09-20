import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePermissions } from './usePermissions';
import { resetInertia } from '@/testing/inertia';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

function read(): ReturnType<typeof usePermissions> {
    const captured: { api?: ReturnType<typeof usePermissions> } = {};
    mount(
        defineComponent({
            setup() {
                captured.api = usePermissions();
                return () => null;
            },
        }),
    );
    if (!captured.api) throw new Error('composable did not run');
    return captured.api;
}

describe('usePermissions', () => {
    beforeEach(() => resetInertia({}));

    it('treats a page without shared auth props as no permissions and no user', () => {
        const { user, can, canAny } = read();

        expect(user.value).toBeNull();
        expect(can('teams.view')).toBe(false);
        expect(canAny(['teams.view', 'users.view'])).toBe(false);
    });

    it('answers from the effective permissions the server shared', () => {
        resetInertia({ auth: { user: { id: 1, username: 'demo', name: 'Demo' }, permissions: ['teams.view'] } });
        const { user, can, canAny } = read();

        expect(user.value?.username).toBe('demo');
        expect(can('teams.view')).toBe(true);
        expect(can('teams.create')).toBe(false);
        expect(canAny(['teams.create', 'teams.view'])).toBe(true);
    });
});
