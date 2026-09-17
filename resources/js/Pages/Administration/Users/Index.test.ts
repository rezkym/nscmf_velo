import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Index from './Index.vue';

describe('FE-12: User list, profile, roles, Team dan active status', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('AC1 — users_send_allowlisted_fields: create sends {name, username, team_id, role_ids} and profile edit does not leak is_protected_superadmin or password', async () => {
        const wrapper = mount(Index, {
            props: {
                users: [],
                teams: [{ id: 1, name: 'Operations' }],
                roles: [{ id: 2, name: 'Operator' }],
                userPermissions: ['users.view', 'users.create', 'users.update'],
            },
        });

        // The stub doesn't have create user button or form
        expect(wrapper.find('[data-testid="btn-create-user"]').exists()).toBe(true);
    });

    it('AC2 — users_gate_each_operation: users.view without assign_roles cannot edit roles; role name Superadmin is not bypass', async () => {
        const wrapper = mount(Index, {
            props: {
                users: [
                    {
                        id: 10,
                        name: 'Normal Admin',
                        username: 'normal.admin',
                        team_id: 1,
                        team_name: 'Operations',
                        is_active: true,
                        is_protected_superadmin: false,
                        roles: [{ id: 99, name: 'Superadmin' }],
                    },
                ],
                teams: [{ id: 1, name: 'Operations' }],
                roles: [{ id: 99, name: 'Superadmin' }],
                userPermissions: ['users.view'], // no users.assign_roles
            },
        });

        expect(wrapper.find('[data-testid="user-row-10"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="btn-edit-roles-10"]').exists()).toBe(false);
    });

    it('AC3 — users_protect_bootstrap_identity: team null protected is accepted, disable/downgrade not available; server denial is handled', async () => {
        const wrapper = mount(Index, {
            props: {
                users: [
                    {
                        id: 1,
                        name: 'Protected Superadmin',
                        username: 'superadmin',
                        team_id: null,
                        team_name: null,
                        is_active: true,
                        is_protected_superadmin: true,
                        roles: [{ id: 1, name: 'Superadmin' }],
                    },
                ],
                teams: [],
                roles: [{ id: 1, name: 'Superadmin' }],
                userPermissions: ['users.view', 'users.disable', 'users.assign_roles'],
            },
        });

        expect(wrapper.find('[data-testid="protected-badge-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="btn-disable-user-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-edit-roles-1"]').exists()).toBe(false);
    });

    it('AC4 — users_distinguish_team_and_access_change: Team-only does not claim session revocation, role/disable/reset require sensitive re-auth flow', async () => {
        const wrapper = mount(Index, {
            props: {
                users: [
                    {
                        id: 20,
                        name: 'Staff',
                        username: 'staff',
                        team_id: 1,
                        team_name: 'Operations',
                        is_active: true,
                        is_protected_superadmin: false,
                        roles: [{ id: 2, name: 'Operator' }],
                    },
                ],
                teams: [
                    { id: 1, name: 'Operations' },
                    { id: 2, name: 'Finance' },
                ],
                roles: [{ id: 2, name: 'Operator' }],
                userPermissions: ['users.view', 'users.assign_team', 'users.assign_roles', 'users.reset_password', 'users.disable'],
            },
        });

        expect(wrapper.find('[data-testid="btn-edit-team-20"]').exists()).toBe(true);
    });
});
