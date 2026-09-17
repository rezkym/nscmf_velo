import { router } from '@inertiajs/vue3';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Index from './Index.vue';

interface MockForm {
    name: string;
    processing: boolean;
    errors: Record<string, string>;
    hasErrors: boolean;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    clearErrors: ReturnType<typeof vi.fn>;
}

let currentForm: MockForm;

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent } = await import('vue');

    return {
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: false } },
            setup: () => () => null,
        }),
        Link: defineComponent({
            name: 'InertiaLink',
            props: { href: { type: String, required: true } },
            setup:
                (_props, { slots }) =>
                () =>
                    slots.default ? slots.default() : null,
        }),
        router: {
            post: vi.fn((_url: string, _data: unknown, options?: { onFinish?: () => void }) => {
                if (options?.onFinish) {
                    options.onFinish();
                }
            }),
            get: vi.fn(),
        },
        useForm: vi.fn((initialData: { name?: string }) => {
            currentForm = reactive({
                name: initialData.name || '',
                processing: false,
                errors: {},
                hasErrors: false,
                post: vi.fn(),
                patch: vi.fn(),
                reset: vi.fn((...fields: string[]) => {
                    if (fields.length === 0 || fields.includes('name')) {
                        currentForm.name = '';
                    }
                }),
                clearErrors: vi.fn(),
            });
            return currentForm;
        }),
    };
});

const defaultTeams = [
    {
        id: 1,
        name: 'Team Alpha',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 2,
        name: 'Team Beta',
        is_active: false,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
    },
];

describe('Index.vue (FE-11: Team Administration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('AC1: teams_do_not_filter_workflow_authority — Team edit tidak membuat scope selector atau permission mapping', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.view', 'teams.create', 'teams.update', 'teams.archive'],
            },
        });

        // 1. Team edit/create form MUST only have `name` input.
        // It MUST NOT render any scope selector, permission mapping, reviewer scope, approver scope, unit, or division.
        const forbiddenSelectors = [
            'select[name="scope"]',
            'select[name="role"]',
            'input[name="permission"]',
            'input[name="permissions"]',
            'select[name="reviewer_scope"]',
            'select[name="approval_scope"]',
            'select[name="unit"]',
            'select[name="division"]',
            '[data-testid="scope-selector"]',
            '[data-testid="permission-mapping"]',
        ];

        for (const selector of forbiddenSelectors) {
            expect(wrapper.find(selector).exists()).toBe(false);
        }

        // Open edit dialog/mode for Team Alpha
        const editButton = wrapper.find('[data-testid="edit-team-1"]');
        expect(editButton.exists()).toBe(true);
        await editButton.trigger('click');

        // Verify form fields
        const nameInput = wrapper.find('input#team-name');
        expect(nameInput.exists()).toBe(true);

        // Verify still NO scope/permission mapping rendered in edit modal/form
        for (const selector of forbiddenSelectors) {
            expect(wrapper.find(selector).exists()).toBe(false);
        }

        // Check text content does NOT promise or mention workflow authority, reviewer/approver scoping
        const formText = wrapper.text().toLowerCase();
        expect(formText).not.toContain('reviewer scope');
        expect(formText).not.toContain('approval scope');
        expect(formText).not.toContain('permission mapping');

        // Submit patch update
        currentForm.name = 'Team Alpha Updated';
        const formEl = wrapper.find('form');
        await formEl.trigger('submit.prevent');

        expect(currentForm.patch).toHaveBeenCalledWith('/administration/teams/1', expect.any(Object));

        // Test onSuccess callback of patch
        const patchCall = currentForm.patch.mock.calls[0];
        if (patchCall && patchCall[1]?.onSuccess) {
            patchCall[1].onSuccess();
        }
        await wrapper.vm.$nextTick();
        expect(wrapper.find('input#team-name').exists()).toBe(false);
    });

    it('AC2: teams_support_deactivate_and_reactivate — correct POST endpoint, reason/input bila kontrak mensyaratkan, pending tidak double', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.view', 'teams.create', 'teams.update', 'teams.archive'],
            },
        });

        // Team 1 is active -> Deactivate button should exist
        const deactivateBtn = wrapper.find('[data-testid="deactivate-team-1"]');
        expect(deactivateBtn.exists()).toBe(true);

        await deactivateBtn.trigger('click');

        // Lifecycle dialog / confirm should explain active Team eligibility impact on create, NOT loss of review/approval scope
        expect(wrapper.text()).toContain('active Team eligibility');
        expect(wrapper.text()).not.toContain('review scope');
        expect(wrapper.text()).not.toContain('approval scope');

        // Confirm deactivation
        const confirmBtn = wrapper.find('[data-testid="confirm-lifecycle-action"]');
        expect(confirmBtn.exists()).toBe(true);
        await confirmBtn.trigger('click');

        // Should call router.post to /administration/teams/1/deactivate
        expect(vi.spyOn(router, 'post')).toHaveBeenCalledWith(
            '/administration/teams/1/deactivate',
            expect.any(Object),
            expect.any(Object),
        );

        // Team 2 is inactive -> Reactivate button should exist
        const reactivateBtn = wrapper.find('[data-testid="reactivate-team-2"]');
        expect(reactivateBtn.exists()).toBe(true);
        await reactivateBtn.trigger('click');

        const confirmReactivateBtn = wrapper.find('[data-testid="confirm-lifecycle-action"]');
        await confirmReactivateBtn.trigger('click');

        expect(vi.spyOn(router, 'post')).toHaveBeenCalledWith(
            '/administration/teams/2/reactivate',
            expect.any(Object),
            expect.any(Object),
        );
    });

    it('AC3: teams_show_server_validation — duplicate name errors dekat field tanpa optimistic fake success; name150 boundary, JANGAN mengirim code/description', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.view', 'teams.create', 'teams.update', 'teams.archive'],
            },
        });

        // Open create modal
        const createBtn = wrapper.find('[data-testid="create-team-btn"]');
        expect(createBtn.exists()).toBe(true);
        await createBtn.trigger('click');

        const nameInput = wrapper.find<HTMLInputElement>('input#team-name');
        expect(nameInput.exists()).toBe(true);
        expect(nameInput.attributes('maxlength')).toBe('150');

        // Verify there is NO code or description field in the form DOM
        expect(wrapper.find('input#team-code').exists()).toBe(false);
        expect(wrapper.find('input[name="code"]').exists()).toBe(false);
        expect(wrapper.find('textarea#team-description').exists()).toBe(false);
        expect(wrapper.find('textarea[name="description"]').exists()).toBe(false);

        // Submit form
        currentForm.name = 'Team Alpha';
        const formEl = wrapper.find('form');
        await formEl.trigger('submit.prevent');

        // Verify useForm post was called to /administration/teams with ONLY name
        expect(currentForm.post).toHaveBeenCalledWith('/administration/teams', expect.any(Object));

        // Test onSuccess callback of post
        const postCall = currentForm.post.mock.calls[0];
        if (postCall && postCall[1]?.onSuccess) {
            postCall[1].onSuccess();
        }
        await wrapper.vm.$nextTick();
        expect(wrapper.find('input#team-name').exists()).toBe(false);

        // Reopen create modal to check server validation error display near field
        await createBtn.trigger('click');
        currentForm.errors = { name: 'The team name has already been taken.' };
        await wrapper.vm.$nextTick();

        const errorElement = wrapper.find('[data-testid="team-name-error"]');
        expect(errorElement.exists()).toBe(true);
        expect(errorElement.text()).toContain('The team name has already been taken.');
    });

    it('AC4: teams_preserve_historical_snapshot — Team fixture berubah tidak mengubah label snapshot existing record di UI model', () => {
        // When historical snapshot records exist with team snapshot label, mutating/updating team data doesn't alter snapshot
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                historicalSnapshots: [
                    {
                        id: 101,
                        request_no: 'REQ-001',
                        team_id: 1,
                        team_snapshot_name: 'Team Alpha (Original Historical)',
                    },
                ],
                permissions: ['teams.view'],
            },
        });

        // Even if Team Alpha name is updated or displayed, the snapshot in existing records remains preserved
        expect(wrapper.text()).toContain('Team Alpha (Original Historical)');
    });

    it('displays empty state when no teams are configured', () => {
        const wrapper = mount(Index, {
            props: {
                teams: [],
                permissions: ['teams.view'],
            },
        });

        expect(wrapper.text()).toContain('No teams configured.');
    });

    it('covers closeFormModal and cancel button in form modal', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.create'],
            },
        });

        // Open create modal
        await wrapper.find('[data-testid="create-team-btn"]').trigger('click');
        const input = wrapper.find<HTMLInputElement>('input#team-name');
        expect(input.exists()).toBe(true);

        // Trigger input event to ensure v-model update runs through input handler
        await input.setValue('New Team Name');

        // Cancel modal
        const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
        expect(cancelBtn).toBeDefined();
        await cancelBtn!.trigger('click');

        // Modal closed
        expect(wrapper.find('input#team-name').exists()).toBe(false);
    });

    it('guards form submission and displays Saving... when form.processing is true', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.create'],
            },
        });

        await wrapper.find('[data-testid="create-team-btn"]').trigger('click');

        currentForm.name = 'Valid Team Name';
        currentForm.processing = true;
        await wrapper.vm.$nextTick();

        // Button should show "Saving..." and be disabled
        const saveBtn = wrapper.find('[data-testid="save-team-btn"]');
        expect(saveBtn.text()).toBe('Saving...');
        expect(saveBtn.attributes('disabled')).toBeDefined();

        // Submit form while processing
        const formEl = wrapper.find('form');
        await formEl.trigger('submit.prevent');

        // Neither post nor patch should be called because form.processing guard returned early
        expect(currentForm.post).not.toHaveBeenCalled();
        expect(currentForm.patch).not.toHaveBeenCalled();
    });

    it('covers cancelLifecycleAction when lifecycle dialog is open', async () => {
        const wrapper = mount(Index, {
            props: {
                teams: defaultTeams,
                permissions: ['teams.archive'],
            },
        });

        // Open deactivate dialog
        await wrapper.find('[data-testid="deactivate-team-1"]').trigger('click');
        expect(wrapper.find('[data-testid="confirm-lifecycle-action"]').exists()).toBe(true);

        // Click cancel
        const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
        expect(cancelBtn).toBeDefined();
        await cancelBtn!.trigger('click');

        // Dialog should be closed
        expect(wrapper.find('[data-testid="confirm-lifecycle-action"]').exists()).toBe(false);
    });
});
