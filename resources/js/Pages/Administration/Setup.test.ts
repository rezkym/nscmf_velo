import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';

import Setup from './Setup.vue';

// Mock Inertia router and useForm
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockVisit = vi.fn();

interface MockFormRecord {
    [key: string]: unknown;
    errors: Record<string, string>;
    processing: boolean;
    wasSuccessful: boolean;
    hasErrors: boolean;
    recentlySuccessful: boolean;
    lastAction?: {
        method: string;
        url: string;
        options?: { onSuccess?: (page?: unknown) => void; onError?: (errs: unknown) => void };
    };
    data: () => Record<string, unknown>;
    transform: (callback: (data: Record<string, unknown>) => unknown) => unknown;
    reset: (...fields: string[]) => void;
    clearErrors: (...fields: string[]) => void;
    setError: (field: string, message: string) => void;
    post: (url: string, options?: { onSuccess?: (page?: unknown) => void; onError?: (errs: unknown) => void }) => void;
    patch: (url: string, options?: { onSuccess?: (page?: unknown) => void; onError?: (errs: unknown) => void }) => void;
}

let createdForms: MockFormRecord[] = [];

vi.mock('@inertiajs/vue3', () => ({
    Head: defineComponent({
        props: ['title'],
        setup: () => () => h('div', { class: 'inertia-head' }),
    }),
    useForm: vi.fn((initialValues: Record<string, unknown>) => {
        const formObj: MockFormRecord = reactive({
            ...initialValues,
            errors: {},
            processing: false,
            wasSuccessful: false,
            hasErrors: false,
            recentlySuccessful: false,
            data() {
                const copy: Record<string, unknown> = { ...(formObj as Record<string, unknown>) };
                delete copy.errors;
                delete copy.processing;
                delete copy.wasSuccessful;
                delete copy.hasErrors;
                delete copy.recentlySuccessful;
                delete copy.data;
                delete copy.transform;
                delete copy.reset;
                delete copy.clearErrors;
                delete copy.setError;
                delete copy.post;
                delete copy.patch;
                return copy;
            },
            transform(callback: (data: Record<string, unknown>) => unknown) {
                return callback(formObj.data());
            },
            reset(...fields: string[]) {
                if (fields.length === 0) {
                    Object.assign(formObj, initialValues);
                } else {
                    for (const f of fields) {
                        (formObj as Record<string, unknown>)[f] = initialValues[f];
                    }
                }
            },
            clearErrors(...fields: string[]) {
                if (fields.length === 0) {
                    formObj.errors = {};
                } else {
                    for (const f of fields) {
                        delete formObj.errors[f];
                    }
                }
            },
            setError(field: string, message: string) {
                formObj.errors[field] = message;
            },
            post: vi.fn(
                (
                    url: string,
                    options?: { onSuccess?: (page?: unknown) => void; onError?: (errs: unknown) => void },
                ) => {
                    mockPost(url, options);
                    formObj.lastAction = { method: 'post', url, options };
                },
            ),
            patch: vi.fn(
                (
                    url: string,
                    options?: { onSuccess?: (page?: unknown) => void; onError?: (errs: unknown) => void },
                ) => {
                    mockPatch(url, options);
                    formObj.lastAction = { method: 'patch', url, options };
                },
            ),
        });
        createdForms.push(formObj);
        return formObj;
    }),
    router: {
        visit: vi.fn((url: string, options?: unknown) => mockVisit(url, options)),
        post: vi.fn((url: string, data?: unknown, options?: unknown) =>
            mockPost(url, { data, ...(options as object) }),
        ),
    },
}));

describe('FE-15: Initial Setup Wizard Composition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createdForms = [];
    });

    const defaultProps = {
        readiness: {
            roles_configured: false,
            teams_configured: false,
            users_configured: false,
            setup_completed: false,
            signing_ready: true,
        },
        roles: [],
        teams: [],
        users: [],
        permissionCatalog: [
            { name: 'nscmf.create', group: 'NSCMF Management', description: 'Create NSCMF' },
            { name: 'nscmf.review', group: 'Review & Approval', description: 'Review NSCMF' },
            { name: 'nscmf.approve', group: 'Review & Approval', description: 'Approve NSCMF' },
            { name: 'teams.create', group: 'Master Data & Administration', description: 'Create Teams' },
            { name: 'users.create', group: 'User & Access Management', description: 'Create Users' },
        ],
        userPermissions: [
            'roles.create',
            'roles.update',
            'permissions.assign',
            'teams.create',
            'teams.update',
            'users.create',
            'users.update',
            'users.assign_roles',
            'users.assign_team',
        ],
    };

    // AC1 — setup_has_exact_supported_steps:
    // Empat langkah: Role Setup (template/manual), Team Setup, Users & Role Assignment, Complete.
    // Progress stepper accessible, LARANGAN: tidak ada Unit/Division/Scope atau personal signature upload step.
    it('AC1 — setup_has_exact_supported_steps: renders 4 exact steps and prohibits Unit/Division/Scope or personal signature upload', () => {
        const wrapper = mount(Setup, {
            props: defaultProps,
        });

        // Accessible Stepper present
        const stepper = wrapper.find('[data-testid="setup-stepper"]');
        expect(stepper.exists()).toBe(true);
        expect(stepper.attributes('role')).toBe('navigation');
        expect(stepper.attributes('aria-label')).toBe('Setup progress');

        // Check exact steps
        const stepItems = wrapper.findAll('[data-testid="stepper-step"]');
        expect(stepItems).toHaveLength(4);

        const stepTexts = stepItems.map((s) => s.text().toLowerCase());
        expect(stepTexts[0]).toContain('role');
        expect(stepTexts[1]).toContain('team');
        expect(stepTexts[2]).toContain('user');
        expect(stepTexts[3]).toContain('complete');

        // PROHIBITED terms checks across the entire component
        const html = wrapper.html().toLowerCase();
        expect(html).not.toContain('unit');
        expect(html).not.toContain('division');
        expect(html).not.toContain('reviewer scope');
        expect(html).not.toContain('approval scope');
        expect(html).not.toContain('signature upload');
        expect(html).not.toContain('private-key upload');
        expect(html).not.toContain('upload signature');
        expect(html).not.toContain('private key');

        // Check Role Setup offers Template or Manual mode
        expect(wrapper.find('[data-testid="role-mode-template"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="role-mode-manual"]').exists()).toBe(true);
    });

    // AC2 — setup_does_not_fake_completion: Team create gagal keeps step; stale page tidak menandai setup ready.
    // Data wajib TIDAK boleh diisi fake defaults untuk menyelesaikan wizard.
    it('AC2 — setup_does_not_fake_completion: mutation failure keeps current step; cannot jump forward with fake completion', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
            },
        });

        // Should start at step 2 (Team Setup) since roles are already configured
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Attempting to proceed without completing team configuration should not advance
        const nextButton = wrapper.find('[data-testid="btn-next-step"]');
        expect(nextButton.attributes('disabled')).toBeDefined();

        // Fill team creation form
        const teamInput = wrapper.find('[data-testid="input-team-name"]');
        expect(teamInput.exists()).toBe(true);
        await teamInput.setValue('NOC Team');

        const createTeamBtn = wrapper.find('[data-testid="btn-create-team"]');
        await createTeamBtn.trigger('click');

        // Verify POST was sent to /administration/teams
        expect(mockPost).toHaveBeenCalledWith(
            '/administration/teams',
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            }),
        );

        // Simulate server failure / validation error
        const teamFormObj = createdForms.find((f) => f.lastAction?.url === '/administration/teams');
        if (teamFormObj?.lastAction?.options?.onSuccess) {
            teamFormObj.lastAction.options.onSuccess();
        }
        if (teamFormObj?.lastAction?.options?.onError) {
            teamFormObj.lastAction.options.onError({ name: 'Team creation failed' });
        }
        await nextTick();

        // Step remains Team Setup, NOT advanced to step 3
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(false);

        // Stale page: Next step button still disabled because teams are not yet confirmed in props/server state
        expect(wrapper.find('[data-testid="btn-next-step"]').attributes('disabled')).toBeDefined();
    });

    // AC3 — setup_reuses_one_time_credential_safely: next step tidak membawa password ke history/summary.
    it('AC3 — setup_reuses_one_time_credential_safely: temporary credentials are one-time and purged, not retained in summary or step history', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
                teams: [{ id: 1, name: 'Operations', is_active: true }],
                roles: [{ id: 10, name: 'Requester', permissions: ['nscmf.create'] }],
            },
        });

        // Step 3: Users & Role Assignment
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);

        // Fill user creation form
        await wrapper.find('[data-testid="input-user-name"]').setValue('Alice Bob');
        await wrapper.find('[data-testid="input-user-username"]').setValue('alice.bob');
        await wrapper.find('[data-testid="select-user-team"]').setValue('1');
        await wrapper.find('[data-testid="checkbox-role-10"]').setValue(true);
        // Toggle role checkbox off then on to test toggleUserRole filter branch
        await wrapper.find('[data-testid="checkbox-role-10"]').setValue(false);
        await wrapper.find('[data-testid="checkbox-role-10"]').setValue(true);

        // Submit create user
        await wrapper.find('[data-testid="btn-create-user"]').trigger('click');

        expect(mockPost).toHaveBeenCalledWith(
            '/administration/users',
            expect.objectContaining({
                onSuccess: expect.any(Function),
            }),
        );

        // Simulate server response providing a temporary password via flash / callback
        const syntheticTempPassword = 'synthetic-temp-password-12345';
        const userFormObj = createdForms.find((f) => f.lastAction?.url === '/administration/users');
        if (userFormObj?.lastAction?.options?.onSuccess) {
            // Test without tempPass first
            userFormObj.lastAction.options.onSuccess({});
            // Then test with tempPass
            userFormObj.lastAction.options.onSuccess({
                props: {
                    flash: {
                        temporary_password: syntheticTempPassword,
                        username: 'alice.bob',
                    },
                },
            });
        }
        await nextTick();

        // OneTimeCredential modal opens
        const oneTimeDialog = wrapper.find('[data-testid="one-time-credential-container"]');
        expect(oneTimeDialog.exists()).toBe(true);
        expect(oneTimeDialog.text()).toContain(syntheticTempPassword);

        // Dismiss the one-time credential modal
        await wrapper.find('[data-testid="btn-dismiss-credential"]').trigger('click');
        await nextTick();

        // Modal closed
        expect(wrapper.find('[data-testid="one-time-credential-container"]').exists()).toBe(false);

        // Advance to Step 4 (Complete) with user confirmed
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: true,
                setup_completed: false,
                signing_ready: true,
            },
            users: [
                {
                    id: 99,
                    name: 'Alice Bob',
                    username: 'alice.bob',
                    team_id: 1,
                    team_name: 'Operations',
                    is_active: true,
                    is_protected_superadmin: false,
                    roles: [{ id: 10, name: 'Requester' }],
                },
            ],
        });
        await nextTick();

        // Now next step button should be enabled
        const nextBtn = wrapper.find('[data-testid="btn-next-step"]');
        expect(nextBtn.attributes('disabled')).toBeUndefined();
        await nextBtn.trigger('click');
        await nextTick();

        // In Step 4 (Complete / Summary)
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // CRITICAL CHECK: Summary MUST NOT leak the temporary password!
        const summaryText = wrapper.find('[data-testid="step-complete"]').text();
        expect(summaryText).not.toContain(syntheticTempPassword);
        expect(summaryText).toContain('Alice Bob');
        expect(summaryText).toContain('alice.bob');
    });

    // AC4 — setup_can_resume_from_server_state: projection hasil reopen menentukan posisi tanpa rerun mutation.
    it('AC4 — setup_can_resume_from_server_state: server readiness projection determines initial step position on reload', () => {
        // Case A: Fresh setup -> Starts at Step 1 (Role Setup)
        const wrapper1 = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: false,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
            },
        });
        expect(wrapper1.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Case B: Roles already configured -> Starts at Step 2 (Team Setup)
        const wrapper2 = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [{ id: 1, name: 'Superadmin', permissions: [] }],
            },
        });
        expect(wrapper2.find('[data-testid="step-role-setup"]').exists()).toBe(false);
        expect(wrapper2.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Case C: Roles and Teams configured -> Starts at Step 3 (Users Setup)
        const wrapper3 = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [{ id: 1, name: 'Superadmin', permissions: [] }],
                teams: [{ id: 1, name: 'NOC', is_active: true }],
            },
        });
        expect(wrapper3.find('[data-testid="step-users-setup"]').exists()).toBe(true);

        // Case D: Roles, Teams, and Users configured -> Starts at Step 4 (Complete)
        const wrapper4 = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: true,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [{ id: 1, name: 'Superadmin', permissions: [] }],
                teams: [{ id: 1, name: 'NOC', is_active: true }],
                users: [
                    {
                        id: 2,
                        name: 'Admin',
                        username: 'admin',
                        team_id: 1,
                        is_active: true,
                        is_protected_superadmin: true,
                        roles: [{ id: 1, name: 'Superadmin' }],
                    },
                ],
            },
        });
        expect(wrapper4.find('[data-testid="step-complete"]').exists()).toBe(true);

        // Signing readiness status safe display (not private key upload)
        const signingStatus = wrapper4.find('[data-testid="signing-readiness-status"]');
        expect(signingStatus.exists()).toBe(true);
        expect(signingStatus.text()).toContain('Siap');
    });

    // Invariants & Boundaries checks
    it('guards protected superadmin team: does not auto-assign team to protected superadmin with null team', () => {
        const superadminUser = {
            id: 1,
            name: 'Protected Superadmin',
            username: 'superadmin',
            team_id: null,
            team_name: null,
            is_active: true,
            is_protected_superadmin: true,
            roles: [{ id: 1, name: 'Superadmin' }],
        };

        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: true,
                    setup_completed: false,
                    signing_ready: true,
                },
                teams: [{ id: 1, name: 'Network Admin', is_active: true }],
                users: [superadminUser],
            },
        });

        // In user list or summary, superadmin team remains explicitly null/unassigned, not altered
        const summary = wrapper.text();
        expect(summary).toContain('Protected Superadmin');
        expect(summary).not.toContain('Network Admin (Superadmin)');
    });

    it('covers role template and manual role creation interactions', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: false,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [],
            },
        });

        // Apply template
        const applyBtn = wrapper.find('[data-testid="btn-apply-template"]');
        await applyBtn.trigger('click');
        expect(mockPost).toHaveBeenCalledWith(
            '/administration/roles/template',
            expect.objectContaining({
                onSuccess: expect.any(Function),
            }),
        );
        const templateFormObj = createdForms.find((f) => f.lastAction?.url === '/administration/roles/template');
        if (templateFormObj?.lastAction?.options?.onSuccess) {
            templateFormObj.lastAction.options.onSuccess();
        }

        // Switch to manual mode and back to template mode
        const manualRadio = wrapper.find('[data-testid="role-mode-manual"] input[type="radio"]');
        const templateRadio = wrapper.find('[data-testid="role-mode-template"] input[type="radio"]');
        await manualRadio.setValue(true);
        await nextTick();
        await templateRadio.setValue(true);
        await nextTick();
        await manualRadio.setValue(true);
        await nextTick();

        // Fill manual role
        const roleNameInput = wrapper.find('[data-testid="input-manual-role-name"]');
        await roleNameInput.setValue('Custom Operator');

        // Toggle permission (change event on input checkbox)
        const permCheckbox = wrapper.find('input[type="checkbox"]');
        expect(permCheckbox.exists()).toBe(true);
        await permCheckbox.trigger('change');
        await permCheckbox.trigger('change'); // toggle off then on
        await permCheckbox.trigger('change');

        // Submit manual role
        const createManualBtn = wrapper.find('[data-testid="btn-create-manual-role"]');
        await createManualBtn.trigger('click');
        expect(mockPost).toHaveBeenCalledWith(
            '/administration/roles',
            expect.objectContaining({
                onSuccess: expect.any(Function),
            }),
        );

        // Trigger onSuccess callback of manual role creation
        const roleFormObj = createdForms.find((f) => f.lastAction?.url === '/administration/roles');
        if (roleFormObj?.lastAction?.options?.onSuccess) {
            roleFormObj.lastAction.options.onSuccess();
        }
    });

    it('covers flash watch when props.flash has temporary password', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                flash: {
                    temporary_password: 'init-temp-password',
                    username: 'initial.user',
                },
            },
        });
        expect(wrapper.find('[data-testid="one-time-credential-container"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('init-temp-password');

        await wrapper.setProps({
            flash: {
                temporary_password: 'updated-temp-password',
            },
        });
        await nextTick();
        expect(wrapper.text()).toContain('updated-temp-password');
    });

    it('covers all template branches: ungrouped permissions, unassigned users, signing not ready, and prevStep', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: true,
                    setup_completed: false,
                    signing_ready: false, // tests signing_ready === false branch
                },
                roles: [
                    { id: 1, name: 'Custom Role', permissions: [] }, // role.permissions.length === 0
                ],
                teams: [],
                users: [
                    {
                        id: 1,
                        name: 'Regular Unassigned',
                        username: 'unassigned.user',
                        team_id: null,
                        team_name: null,
                        is_active: true,
                        is_protected_superadmin: false, // tests unassigned branch
                        roles: [],
                    },
                    {
                        id: 2,
                        name: 'Root Admin',
                        username: 'root.admin',
                        team_id: null,
                        team_name: null,
                        is_active: true,
                        is_protected_superadmin: true, // tests is_protected_superadmin badge in step 3
                        roles: [],
                    },
                ],
                permissionCatalog: [
                    { name: 'orphan.perm', group: '' }, // tests group || 'General' and perm.description === undefined
                ],
            },
        });

        // Starts at step 4
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('Belum Terkonfigurasi');
        expect(wrapper.text()).toContain('Unassigned');

        // Go to step 1 to view groupedPermissions and role list
        const vm = wrapper.vm as unknown as { currentStep: number; prevStep: () => void };
        vm.prevStep(); // 3
        await nextTick();
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('Protected Superadmin (No Team)');

        vm.prevStep(); // 2
        vm.prevStep(); // 1
        await nextTick();
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Switch to manual mode to render orphan perm
        const manualRadio = wrapper.find('[data-testid="role-mode-manual"] input[type="radio"]');
        await manualRadio.setValue(true);
        await nextTick();
        expect(wrapper.text()).toContain('General');
        expect(wrapper.text()).toContain('orphan.perm');

        // Call prevStep when currentStep is already 1 directly
        vm.prevStep();
        expect(vm.currentStep).toBe(1);
    });

    it('covers all branches of processing checks and edge cases', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: false,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: true,
                },
            },
        });

        // Set processing on all created forms
        for (const form of createdForms) {
            form.processing = true;
        }

        // Test button triggers while processing = true
        await wrapper.find('[data-testid="btn-apply-template"]').trigger('click');
        const manualRadio = wrapper.find('[data-testid="role-mode-manual"] input[type="radio"]');
        await manualRadio.setValue(true);
        await nextTick();
        const roleNameInput = wrapper.find('[data-testid="input-manual-role-name"]');
        await roleNameInput.setValue('Custom Operator');
        for (const form of createdForms) {
            form.processing = true;
        }
        await wrapper.find('form').trigger('submit');

        // Reset processing and advance via next step
        for (const form of createdForms) {
            form.processing = false;
        }
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: false,
                users_configured: false,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        await wrapper.find('[data-testid="btn-next-step"]').trigger('click');
        await nextTick();
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Set processing on team form
        for (const form of createdForms) {
            form.processing = true;
        }
        await wrapper.find('[data-testid="input-team-name"]').setValue('Operations Team');
        await wrapper.find('form').trigger('submit');

        // Advance to step 3
        for (const form of createdForms) {
            form.processing = false;
        }
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: false,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        await wrapper.find('[data-testid="btn-next-step"]').trigger('click');
        await nextTick();
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);

        // Set processing on user form
        for (const form of createdForms) {
            form.processing = true;
        }
        await wrapper.find('[data-testid="input-user-name"]').setValue('User Test');
        await wrapper.find('form').trigger('submit');

        // Advance to step 4
        for (const form of createdForms) {
            form.processing = false;
        }
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: true,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        await wrapper.find('[data-testid="btn-next-step"]').trigger('click');
        await nextTick();
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // Set processing on finish form
        for (const form of createdForms) {
            form.processing = true;
        }
        await wrapper.find('[data-testid="btn-finalize-setup"]').trigger('click');
    });

    it('covers step navigation (previous, next, and direct click)', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: true,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [{ id: 1, name: 'Superadmin', permissions: ['all'] }],
                teams: [{ id: 1, name: 'Network Team', is_active: true }],
                users: [
                    {
                        id: 1,
                        name: 'Admin',
                        username: 'admin',
                        team_id: 1,
                        is_active: true,
                        is_protected_superadmin: true,
                        roles: [{ id: 1, name: 'Superadmin' }],
                    },
                ],
            },
        });

        // Currently at step 4
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // Click Previous step
        const prevBtn = wrapper.find('[data-testid="btn-prev-step"]');
        await prevBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);

        await prevBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        await prevBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Next step
        const nextBtn = wrapper.find('[data-testid="btn-next-step"]');
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Finalize setup
        await nextBtn.trigger('click');
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // prevBtn disabled when on step 1: test prevBtn click on step 1
        await prevBtn.trigger('click');
        await prevBtn.trigger('click');
        await prevBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);
        // Trigger prevBtn when currentStep is 1 to test else branch of currentStep > 1
        await prevBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Unconfigure roles to test nextBtn disabled and failing isStepReadyToAdvance
        await wrapper.setProps({
            readiness: {
                roles_configured: false,
                teams_configured: true,
                users_configured: true,
                setup_completed: false,
                signing_ready: true,
            },
            roles: [],
        });
        await nextTick();
        expect(wrapper.find('[data-testid="btn-next-step"]').attributes('disabled')).toBeDefined();
        await nextBtn.trigger('click'); // will not advance because isStepReadyToAdvance is false
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Restore roles
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: true,
                setup_completed: false,
                signing_ready: true,
            },
            roles: [{ id: 1, name: 'Superadmin', permissions: ['all'] }],
        });
        await nextTick();

        // Advance to step 4 again
        await nextBtn.trigger('click');
        await nextBtn.trigger('click');
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // Call nextStep() directly via component VM while currentStep is 4 to cover case 4 in isStepReadyToAdvance
        expect(wrapper.vm).toBeDefined();
        // Trigger VM methods to hit edge case paths
        const vm = wrapper.vm as unknown as {
            currentStep: number;
            isStepReadyToAdvance: boolean;
            nextStep: () => void;
            prevStep: () => void;
        };
        // Check isStepReadyToAdvance at step 4
        expect(vm.isStepReadyToAdvance).toBe(true);
        // Call nextStep when currentStep is 4 (does not advance past 4)
        vm.nextStep();
        expect(vm.currentStep).toBe(4);

        // Edge case: unexpected step number to cover switch default branch
        vm.currentStep = 99;
        expect(vm.isStepReadyToAdvance).toBe(false);
        vm.currentStep = 4;

        const finalizeBtn = wrapper.find('[data-testid="btn-finalize-setup"]');
        await finalizeBtn.trigger('click');
        expect(mockPost).toHaveBeenCalledWith(
            '/administration/setup/complete',
            expect.objectContaining({
                onSuccess: expect.any(Function),
            }),
        );
        const finishFormObj = createdForms.find((f) => f.lastAction?.url === '/administration/setup/complete');
        if (finishFormObj?.lastAction?.options?.onSuccess) {
            finishFormObj.lastAction.options.onSuccess();
        }
        expect(mockVisit).toHaveBeenCalledWith('/dashboard', undefined);
    });

    // B-15-1: Wizard gates fail CLOSED without relying on client-side row counts
    it('B-15-1 — wizard gates fail closed: readiness projection is the sole gate and does not allow advance via stale client rows', async () => {
        // Step 1: roles_configured=false but 4 stale roles present -> Next button MUST be disabled
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: false,
                    teams_configured: false,
                    users_configured: false,
                    setup_completed: false,
                    signing_ready: false,
                },
                roles: [
                    { id: 1, name: 'Role 1', permissions: [] },
                    { id: 2, name: 'Role 2', permissions: [] },
                    { id: 3, name: 'Role 3', permissions: [] },
                    { id: 4, name: 'Role 4', permissions: [] },
                ],
            },
        });

        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);
        const nextBtn = wrapper.find('[data-testid="btn-next-step"]');
        expect(nextBtn.attributes('disabled')).toBeDefined();
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);

        // Step 2: advance to step 2 with roles_configured=true, but teams_configured=false with 1 inactive team
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: false,
                users_configured: false,
                setup_completed: false,
                signing_ready: false,
            },
            teams: [{ id: 1, name: 'Stale Inactive Team', is_active: false }],
        });
        await nextTick();
        await nextBtn.trigger('click');
        await nextTick();
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);
        expect(nextBtn.attributes('disabled')).toBeDefined();
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Step 3: advance to step 3 with teams_configured=true, but users_configured=false
        // Bootstrap flow: Protected superadmin row exists (users.length > 0)
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: false,
                setup_completed: false,
                signing_ready: false,
            },
            users: [
                {
                    id: 1,
                    name: 'Protected Superadmin',
                    username: 'superadmin',
                    team_id: null,
                    is_active: true,
                    is_protected_superadmin: true,
                    roles: [],
                },
            ],
        });
        await nextTick();
        await nextBtn.trigger('click');
        await nextTick();
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);
        expect(nextBtn.attributes('disabled')).toBeDefined();
        await nextBtn.trigger('click');
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);
    });

    it('handles watch on props.readiness falling back when readiness resets', async () => {
        const wrapper = mount(Setup, {
            props: {
                ...defaultProps,
                readiness: {
                    roles_configured: true,
                    teams_configured: true,
                    users_configured: true,
                    setup_completed: false,
                    signing_ready: true,
                },
                roles: [{ id: 1, name: 'Superadmin', permissions: ['all'] }],
                teams: [{ id: 1, name: 'Network Team', is_active: true }],
                users: [
                    {
                        id: 1,
                        name: 'Admin',
                        username: 'admin',
                        team_id: 1,
                        is_active: true,
                        is_protected_superadmin: true,
                        roles: [{ id: 1, name: 'Superadmin' }],
                    },
                ],
            },
        });

        expect(wrapper.find('[data-testid="step-complete"]').exists()).toBe(true);

        // Fallback when users unconfigured
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: false,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        expect(wrapper.find('[data-testid="step-users-setup"]').exists()).toBe(true);

        // Fallback when teams unconfigured
        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: false,
                users_configured: false,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        expect(wrapper.find('[data-testid="step-team-setup"]').exists()).toBe(true);

        // Fallback when roles unconfigured
        await wrapper.setProps({
            readiness: {
                roles_configured: false,
                teams_configured: false,
                users_configured: false,
                setup_completed: false,
                signing_ready: true,
            },
        });
        await nextTick();
        expect(wrapper.find('[data-testid="step-role-setup"]').exists()).toBe(true);
    });
});
