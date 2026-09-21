import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Ref, defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { flashDomainError, lastRequest, requests, resetInertia } from '@/testing/inertia';
import { useDraftSave } from './useDraftSave';
import type { ActivationDraftFields, ChangeDraftFields } from './types';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

describe('useDraftSave (FE-27)', () => {
    beforeEach(() => {
        resetInertia();
        vi.useFakeTimers();
    });

    describe('AC1: draft_save_uses_ack_version', () => {
        it('sends current expected record_version (v8), adopts acknowledged version (v9) on success, and next save sends v9 without client version++', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'PT Initial Client',
            });

            let onSuccessCalledWith: number | null = null;
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
                onSuccess: (ver) => {
                    onSuccessCalledWith = ver;
                },
            });

            expect(draft.currentVersion.value).toBe(8);
            expect(draft.saveStatus.value).toBeNull();
            expect(draft.isDirty.value).toBe(false);

            // Trigger save explicitly
            const savePromise = draft.save();

            expect(draft.saveStatus.value).toBe('saving');
            expect(draft.isSaving.value).toBe(true);

            const req1 = lastRequest('/nscmf/42/draft');
            expect(req1).toBeDefined();
            expect(req1?.method).toBe('patch');
            expect(req1?.data).toMatchObject({
                record_version: 8,
                activation: {
                    customer_name: 'PT Initial Client',
                },
            });

            // Simulate server success returning updated version v9
            req1?.options.onSuccess?.({
                props: {
                    record: {
                        id: 42,
                        record_version: 9,
                    },
                },
            });
            await savePromise;

            expect(draft.currentVersion.value).toBe(9);
            expect(onSuccessCalledWith).toBe(9);
            expect(draft.saveStatus.value).toBe('saved');
            expect(draft.isSaving.value).toBe(false);

            // Now mutate field and save again
            fields.value.customer_name = 'PT Updated Client';
            expect(draft.isDirty.value).toBe(true);

            const savePromise2 = draft.save();
            const req2 = lastRequest('/nscmf/42/draft');
            expect(req2).toBeDefined();
            // Crucial: Client sends 9 (from server response), NOT 10 (client version++)
            expect(req2?.data).toMatchObject({
                record_version: 9,
                activation: {
                    customer_name: 'PT Updated Client',
                },
            });

            req2?.options.onSuccess?.({
                props: {
                    record: {
                        id: 42,
                        record_version: 10,
                    },
                },
            });
            await savePromise2;

            expect(draft.currentVersion.value).toBe(10);
            expect(draft.saveStatus.value).toBe('saved');
        });
    });

    describe('AC2: draft_save_keeps_newer_edits', () => {
        it('when user types B while request A is in-flight, response A keeps B dirty and does not falsely claim clean Saved', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Input A',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            // Start save for A
            const savePromiseA = draft.save();
            expect(draft.saveStatus.value).toBe('saving');

            const reqA = lastRequest('/nscmf/42/draft');
            expect(reqA?.data).toMatchObject({
                record_version: 8,
                activation: { customer_name: 'Input A' },
            });

            // While A is in-flight, user edits field to B
            fields.value.customer_name = 'Input B';

            // Server completes request A with v9
            reqA?.options.onSuccess?.({
                props: {
                    record: { id: 42, record_version: 9 },
                },
            });
            await savePromiseA;

            // Since fields currently contain 'Input B' (newer than saved snapshot 'Input A'):
            // 1. isDirty MUST be true
            // 2. saveStatus must NOT be 'saved' (should not falsely claim clean saved when newer edits exist)
            // 3. currentVersion should be updated to 9
            expect(draft.currentVersion.value).toBe(9);
            expect(draft.isDirty.value).toBe(true);
            expect(draft.saveStatus.value).not.toBe('saved');
            expect(fields.value.customer_name).toBe('Input B');

            // Next save should send Input B with v9
            const savePromiseB = draft.save();
            const reqB = lastRequest('/nscmf/42/draft');
            expect(reqB?.data).toMatchObject({
                record_version: 9,
                activation: { customer_name: 'Input B' },
            });

            reqB?.options.onSuccess?.({
                props: {
                    record: { id: 42, record_version: 10 },
                },
            });
            await savePromiseB;

            expect(draft.isDirty.value).toBe(false);
            expect(draft.saveStatus.value).toBe('saved');
        });

        it('coalesces/serializes requests so that out-of-order responses or rapid edits do not overwrite newer edits', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Initial',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            fields.value.customer_name = 'First Edit';
            const save1 = draft.save();

            // While save1 is in-flight, trigger save2
            fields.value.customer_name = 'Second Edit';
            const save2 = draft.save();

            // Only 1 network request should be in-flight at a time
            expect(requests.length).toBe(1);

            // Complete save1
            requests[0]?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await save1;

            // Now second request should be dispatched automatically or queue emptied with latest payload
            expect(requests.length).toBe(2);
            expect(requests[1]?.data).toMatchObject({
                record_version: 9,
                activation: { customer_name: 'Second Edit' },
            });

            requests[1]?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 10 } },
            });
            await save2;

            expect(draft.currentVersion.value).toBe(10);
            expect(draft.isDirty.value).toBe(false);
            expect(draft.saveStatus.value).toBe('saved');
        });
    });

    describe('AC3: draft_conflict_preserves_unsaved_input', () => {
        it('on 409 NSCMF_VERSION_CONFLICT: stops autosave, shows conflict state, preserves user input, does not auto-retry', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'My Unsaved Work',
            });

            let onErrorCalledWith: unknown = null;
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
                autosaveInterval: 3000,
                onError: (err) => {
                    onErrorCalledWith = err;
                },
            });

            // Edit field to make dirty
            fields.value.customer_name = 'My Unsaved Work 2';

            // Start autosave
            vi.advanceTimersByTime(3000);
            expect(requests.length).toBe(1);

            const req = requests[0];
            // Simulate 409 conflict delivered via flash domain_error on response
            await flashDomainError({
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
            });
            req?.options.onSuccess?.({
                props: {
                    flash: {
                        domain_error: {
                            code: 'NSCMF_VERSION_CONFLICT',
                            message: 'A newer version of this record exists.',
                        },
                    },
                },
            });

            expect(draft.isConflict.value).toBe(true);
            expect(draft.conflictError.value).toMatchObject({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
            });
            expect(onErrorCalledWith).toMatchObject({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
            });
            expect(draft.saveStatus.value).toBe('error');
            // Unsaved input is preserved in fields
            expect(fields.value.customer_name).toBe('My Unsaved Work 2');

            // Explicit call to save() while in conflict should be rejected/no-op
            await draft.save();
            expect(requests.length).toBe(1);

            // Crucial: Autosave MUST stop! Timer advancing must NOT trigger another request
            vi.advanceTimersByTime(10000);
            expect(requests.length).toBe(1); // No new request dispatched

            // Even if user types more, autosave remains halted while in conflict
            fields.value.customer_name = 'Still More Work';
            vi.advanceTimersByTime(5000);
            expect(requests.length).toBe(1);

            // User has options to resolve: e.g. acknowledge or refresh
            expect(typeof draft.resolveConflict).toBe('function');
            draft.resolveConflict();
            expect(draft.isConflict.value).toBe(false);
            expect(draft.conflictError.value).toBeNull();
        });
    });

    describe('AC4: draft_failure_is_not_success', () => {
        it('handles network failure, 422, and 503 by showing persistent retry UI, setting saveStatus to error, and never claiming saved', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Incomplete Draft',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            // 1. Network failure delivered via onNetworkError
            const save1 = draft.save();
            expect(requests[0]?.options.onNetworkError).toBeTypeOf('function');
            requests[0]?.options.onNetworkError?.(new Error('Network connection lost'));
            requests[0]?.options.onFinish?.();
            await save1;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.feedbackError.value).toMatchObject({
                isNetworkError: true,
            });
            expect(draft.isSaving.value).toBe(false);

            // Retry explicitly
            const retry1 = draft.retry();
            expect(requests.length).toBe(2);

            // 2. 503 Service Unavailable delivered via onHttpException
            expect(requests[1]?.options.onHttpException).toBeTypeOf('function');
            requests[1]?.options.onHttpException?.({
                status: 503,
            });
            requests[1]?.options.onFinish?.();
            await retry1;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.feedbackError.value).toMatchObject({
                status: 503,
            });
            expect(draft.isSaving.value).toBe(false);

            // 3. 422 Validation Error - real Inertia delivers flat Record<string, string> bag to onError
            const retry2 = draft.retry();
            expect(requests.length).toBe(3);
            requests[2]?.options.onError?.({
                'activation.lan_ip_allocation': 'Invalid IP format',
            });
            await retry2;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.validationErrors.value).toMatchObject({
                'activation.lan_ip_allocation': 'Invalid IP format',
            });
            expect(draft.feedbackError.value?.status).toBe(422);
            // No client-invented code: the Inertia error bag carries none (G07).
            expect(draft.feedbackError.value?.code).toBeUndefined();
        });

        it('supports empty incomplete draft without treating missing submit-required fields as draft save blockers', async () => {
            // An incomplete draft with null/empty fields is completely valid for draft save
            const fields = ref<ActivationDraftFields>({
                customer_name: '',
                contact_name: null,
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            const savePromise = draft.save();
            const req = lastRequest('/nscmf/42/draft');
            expect(req).toBeDefined();
            expect(req?.data).toMatchObject({
                record_version: 8,
                activation: {
                    customer_name: null,
                    contact_name: null,
                },
            });

            req?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await savePromise;

            expect(draft.saveStatus.value).toBe('saved');
        });
    });

    describe('AC5: draft_serializes_whole_sets', () => {
        it('serializes Activation draft with collections, whole-set replacement and safe null semantics (blank string = null)', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: '   ', // blank -> null
                installation_rfs_date: '2026-09-30',
                references: [
                    { reference_type: 'IWO', specification: '' }, // selection preserved, blank -> null
                ],
                sla_items: [
                    { row_no: 1, requirement_text: 'Uptime 99.9%' },
                    { row_no: 2, requirement_text: '   ' }, // unstarted -> dropped
                ],
                direct_site: {
                    latency_ms: 15,
                    rssi: null,
                },
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            const savePromise = draft.save();
            const req = lastRequest('/nscmf/42/draft');

            expect(req?.data).toEqual({
                record_version: 8,
                activation: {
                    customer_name: null,
                    installation_rfs_date: '2026-09-30',
                    references: [{ reference_type: 'IWO', specification: null }],
                    sla_items: [{ row_no: 1, requirement_text: 'Uptime 99.9%' }],
                    direct_site: {
                        latency_ms: 15,
                        rssi: null,
                    },
                },
            });

            req?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await savePromise;
            expect(draft.currentVersion.value).toBe(9);
        });

        it('serializes Change draft with collections and results (while in draft/revision state)', async () => {
            const fields = ref<ChangeDraftFields>({
                maintenance_purpose: 'Switch upgrade',
                facing_challenges: [{ row_no: 1, challenge_text: 'Limited maintenance window' }],
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Upgraded successfully',
                        performance_information: 'All ports active',
                        result_status: 'SUCCESS',
                    },
                ],
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'CHANGE',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
            });

            const savePromise = draft.save();
            const req = lastRequest('/nscmf/42/draft');

            expect(req?.data).toEqual({
                record_version: 8,
                change: {
                    maintenance_purpose: 'Switch upgrade',
                    facing_challenges: [{ row_no: 1, challenge_text: 'Limited maintenance window' }],
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Upgraded successfully',
                            performance_information: 'All ports active',
                            result_status: 'SUCCESS',
                        },
                    ],
                },
            });

            req?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await savePromise;
            expect(draft.currentVersion.value).toBe(9);
        });
    });

    describe('Autosave lifecycle & component mounting', () => {
        function draftOf(fields: Ref<ActivationDraftFields>, extra: Record<string, unknown> = {}) {
            return useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
                ...extra,
            });
        }

        /** Puts the composable into a real conflict the way the server would. */
        function conflict(draft: ReturnType<typeof draftOf>): void {
            lastRequest('/nscmf/42/draft')?.options.onHttpException?.({
                status: 409,
                data: { code: 'NSCMF_VERSION_CONFLICT', message: 'A newer version exists.' },
            });
            expect(draft.isConflict.value).toBe(true);
        }

        it('keeps the acknowledged version when the response carries no record', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            const save = draft.save();
            lastRequest('/nscmf/42/draft')?.options.onSuccess?.({});
            await save;

            expect(draft.currentVersion.value).toBe(8);
        });

        it('reports a flat 422 error bag as validation errors', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            const save = draft.save();
            lastRequest('/nscmf/42/draft')?.options.onError?.({
                'activation.customer_name': 'Invalid name format',
            });
            await save;

            expect(draft.validationErrors.value).toMatchObject({
                'activation.customer_name': 'Invalid name format',
            });
        });

        it('reports a 500 as a plain server error', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            const save = draft.save();
            lastRequest('/nscmf/42/draft')?.options.onHttpException?.({ status: 500 });
            await save;

            expect(draft.feedbackError.value).toEqual({ status: 500, message: 'Server error' });
        });

        it('reports a dropped connection as a network failure', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            const save = draft.save();
            lastRequest('/nscmf/42/draft')?.options.onNetworkError?.(new Error('connection dropped'));
            await save;

            expect(draft.feedbackError.value).toMatchObject({
                status: 0,
                isNetworkError: true,
                message: 'connection dropped',
            });
        });

        it('clears the conflict and adopts the version handed to resolveConflict', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            const save = draft.save();
            conflict(draft);
            await save;

            draft.resolveConflict(15);

            expect(draft.isConflict.value).toBe(false);
            expect(draft.conflictError.value).toBeNull();
            expect(draft.feedbackError.value).toBeNull();
            expect(draft.currentVersion.value).toBe(15);
        });

        it('starts autosaving only when there is something to save', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields, { autosaveInterval: 2000 });

            draft.stopAutosave();
            expect(draft.isDirty.value).toBe(false);
            draft.startAutosave();
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(0);

            draft.stopAutosave();
            fields.value.customer_name = 'Changed While Stopped';
            draft.startAutosave();
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(1);
        });

        it('restarts the debounce on each edit so quick typing saves once, at the end', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            draftOf(fields, { autosaveInterval: 1000 });

            fields.value.customer_name = 'First keystroke';
            vi.advanceTimersByTime(600);
            fields.value.customer_name = 'Second keystroke';
            vi.advanceTimersByTime(600);

            // The first timer was cleared by the second edit, so nothing has been sent yet.
            expect(requests.length).toBe(0);

            vi.advanceTimersByTime(400);
            expect(requests.length).toBe(1);
            expect(
                (lastRequest('/nscmf/42/draft')?.data as { activation: { customer_name: string } }).activation,
            ).toMatchObject({ customer_name: 'Second keystroke' });
        });

        it('does not autosave while a conflict is unresolved', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields, { autosaveInterval: 2000 });

            fields.value.customer_name = 'First change';
            const save = draft.save();
            conflict(draft);
            await save;

            const sent = requests.length;
            fields.value.customer_name = 'Change during conflict';
            draft.startAutosave();
            vi.advanceTimersByTime(2000);

            expect(requests.length).toBe(sent);
        });

        it('does not autosave while a save is already in flight', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields, { autosaveInterval: 1000 });

            fields.value.customer_name = 'First change';
            void draft.save();
            expect(requests.length).toBe(1);

            // The request is deliberately left unanswered, so the next tick must find one in flight.
            fields.value.customer_name = 'Change while in flight';
            vi.advanceTimersByTime(1000);

            expect(requests.length).toBe(1);
        });

        it.each([
            ['no autosave interval is configured', {}],
            ['autosave is disabled', { autosaveInterval: 1000, enabled: false }],
        ])('tracks dirty state but sends nothing when %s', (_case, extra) => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields, extra);

            fields.value.customer_name = 'Changed';
            vi.advanceTimersByTime(2000);

            expect(draft.isDirty.value).toBe(true);
            expect(requests.length).toBe(0);
        });

        it('sends nothing on a field change after autosave was stopped', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields, { autosaveInterval: 1000 });

            draft.stopAutosave();
            fields.value.customer_name = 'Changed while stopped';
            vi.advanceTimersByTime(2000);

            expect(draft.isDirty.value).toBe(true);
            expect(requests.length).toBe(0);
        });

        it('is clean again when a field is edited back to its saved value', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial Name' });
            const draft = draftOf(fields);

            fields.value.customer_name = 'Changed';
            expect(draft.isDirty.value).toBe(true);

            fields.value.customer_name = 'Initial Name';
            expect(draft.isDirty.value).toBe(false);
        });

        it('collapses several saves queued behind one in-flight request into a single follow-up', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'In-flight Base' });
            const draft = draftOf(fields);

            const first = draft.save();
            expect(requests.length).toBe(1);

            fields.value.customer_name = 'Queued 1';
            const queued1 = draft.save();
            fields.value.customer_name = 'Queued 2';
            const queued2 = draft.save();
            expect(requests.length).toBe(1);

            requests[0]?.options.onSuccess?.({ props: { record: { id: 42, record_version: 9 } } });
            await first;

            expect(requests.length).toBe(2);
            requests[1]?.options.onSuccess?.({ props: { record: { id: 42, record_version: 10 } } });
            await Promise.all([queued1, queued2]);

            expect(draft.currentVersion.value).toBe(10);
        });

        it('automatically saves dirty changes on debounce/interval when enabled', () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Initial Name',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                businessStatus: 'DRAFT',
                fields,
                autosaveInterval: 3000,
            });

            expect(requests.length).toBe(0);

            // Edit field -> becomes dirty
            fields.value.customer_name = 'Auto Save Name';
            expect(draft.isDirty.value).toBe(true);

            // Timer not reached
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(0);

            // Timer elapsed
            vi.advanceTimersByTime(1000);
            expect(requests.length).toBe(1);

            requests[0]?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });

            expect(draft.currentVersion.value).toBe(9);
            expect(draft.saveStatus.value).toBe('saved');
            expect(draft.isDirty.value).toBe(false);
        });

        it('pauses and resumes autosave, and cleans up timers on unmount / stop', () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Test',
            });

            let hookDraft: ReturnType<typeof useDraftSave> | null = null;
            const TestComponent = defineComponent({
                setup() {
                    hookDraft = useDraftSave({
                        recordId: 42,
                        family: 'ACTIVATION',
                        recordVersion: 8,
                        businessStatus: 'DRAFT',
                        fields,
                        autosaveInterval: 3000,
                    });
                    return () => h('div');
                },
            });

            const wrapper = mount(TestComponent);

            fields.value.customer_name = 'Paused Test';
            const instance = hookDraft!;
            instance.stopAutosave();

            vi.advanceTimersByTime(5000);
            expect(requests.length).toBe(0);

            instance.startAutosave();
            vi.advanceTimersByTime(3000);
            expect(requests.length).toBe(1);

            // Clean up component / unmount
            wrapper.unmount();
            fields.value.customer_name = 'Unmounted Test';
            vi.advanceTimersByTime(5000);
            // No new request after unmount
            expect(requests.length).toBe(1);
        });
    });

    describe('Additional coverage for branch & edge paths', () => {
        it('covers onFlash and fallback to usePage() flash conflict', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Test' });
            let onErrorCalledWith: unknown = null;
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                businessStatus: 'DRAFT',
                fields,
                onError: (err) => {
                    onErrorCalledWith = err;
                },
            });

            void draft.save();
            const req = lastRequest('/nscmf/42/draft');
            expect(req).toBeDefined();

            // 1. Call onFlash with a domain error that has conflict without message (testing message fallback)
            req?.options.onFlash?.({
                flash: {
                    domain_error: {
                        code: 'NSCMF_VERSION_CONFLICT',
                    },
                },
            });

            expect(draft.isConflict.value).toBe(true);
            expect(draft.conflictError.value?.message).toBe('A newer version of this record exists.');
            expect(onErrorCalledWith).toMatchObject({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
            });
        });

        it('covers checkPageFlashForConflict fallback to usePage() when pageOrFlash is null/empty', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Test' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                businessStatus: 'DRAFT',
                fields,
            });

            void draft.save();
            const req = lastRequest('/nscmf/42/draft');
            expect(req).toBeDefined();

            // Set up pageProps.flash directly in mock inertia
            await flashDomainError({
                code: 'NSCMF_STATE_CONFLICT',
                message: 'Conflict from page',
            });

            // Call onSuccess with null/empty page so checkPageFlashForConflict has to fall back to usePage()
            req?.options.onSuccess?.(null);

            expect(draft.isConflict.value).toBe(true);
            expect(draft.conflictError.value).toMatchObject({
                status: 409,
                code: 'NSCMF_STATE_CONFLICT',
                message: 'Conflict from page',
            });
        });

        it('covers inFlightSnapshot fallback branch, empty onError branch, and non-conflict onHttpException branches', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                businessStatus: 'DRAFT',
                fields,
            });

            // 1. onError with null err
            void draft.save();
            let req = lastRequest('/nscmf/42/draft');
            req?.options.onError?.(null as never);
            expect(draft.saveStatus.value).toBe('error');
            expect(draft.validationErrors.value).toEqual({});

            // 2. onHttpException 409 with empty envelopeData code/message fallbacks
            draft.resolveConflict();
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            req?.options.onHttpException?.({
                status: 409,
                data: {},
            });
            expect(draft.isConflict.value).toBe(true);
            // The body carried no code, so none is claimed and the copy stays neutral.
            expect(draft.conflictError.value?.code).toBeUndefined();
            expect(draft.conflictError.value?.message).toBe('This record changed. Refresh to see the latest version.');

            // 3. onHttpException 422 with real-shaped envelopeData.code and message fallbacks, and fallback to defaults
            draft.resolveConflict();
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            req?.options.onHttpException?.({
                status: 422,
                data: {
                    code: '',
                    message: '',
                    errors: undefined,
                },
            });
            expect(draft.feedbackError.value?.code).toBeUndefined();
            expect(draft.feedbackError.value?.message).toBe('Validation failed');
            expect(draft.validationErrors.value).toBeNull();

            // 3b. onHttpException 422 with explicit envelope errors
            draft.resolveConflict();
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            req?.options.onHttpException?.({
                status: 422,
                data: {
                    code: 'NSCMF_VALIDATION_FAILED',
                    message: 'Validation failed',
                    errors: {
                        customer_name: ['Customer name is required'],
                    },
                },
            });
            expect(draft.validationErrors.value).toEqual({
                customer_name: ['Customer name is required'],
            });

            // 4. inFlightSnapshot fallback when inFlightSnapshot is null at onSuccess
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            // Trigger second concurrent save while first in flight so inFlightCount > 1
            fields.value.customer_name = 'Changed';
            // Finish first request with clean page
            req?.options.onSuccess?.({ props: { record: { record_version: 2 } } });
            expect(draft.currentVersion.value).toBe(2);

            // 5. Test double finishThisRequest to cover settled early-return branch
            req?.options.onError?.({});
            expect(draft.currentVersion.value).toBe(2);

            // 6. onHttpException with non-object response to cover typeof fallback to 500
            draft.resolveConflict();
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            req?.options.onHttpException?.(null as never);
            expect(draft.feedbackError.value?.status).toBe(500);

            // 7. onNetworkError with non-Error value to cover fallback message
            draft.resolveConflict();
            void draft.save();
            req = lastRequest('/nscmf/42/draft');
            req?.options.onNetworkError?.('plain string' as never);
            expect(draft.feedbackError.value?.message).toBe('Network connection lost');
        });

        it('covers lastSavedSnapshot fallback when inFlightSnapshot is null and multiple inFlightCount', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Original' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                businessStatus: 'DRAFT',
                fields,
            });

            // Call router.patch through draft.save()
            void draft.save();
            const req1 = lastRequest('/nscmf/42/draft');

            // Trigger onFlash without conflict
            req1?.options.onFlash?.({});

            // Trigger onNetworkError on request 1 to reset inFlightSnapshot = null
            req1?.options.onNetworkError?.(new Error('fail'));

            // Now trigger a 2nd save so inFlightCount increases and creates a 2nd request
            void draft.save();
            const req2 = lastRequest('/nscmf/42/draft');
            expect(req2).toBeDefined();

            // When req1 threw onNetworkError, req1 has settled = true, so req1?.options.onSuccess?.(...) returns early!
            expect(draft.saveStatus.value).toBe('saving');
        });
    });
});

describe('queued save settlement (FE-27 AC3 / FE-28 AC1)', () => {
    it('settles a queued save when the in-flight request ends in a conflict', async () => {
        const fields = ref<ActivationDraftFields>({ customer_name: 'First' });
        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            businessStatus: 'DRAFT',
            fields,
        });

        const firstSave = draft.save();

        // A second save arrives while the first is still in flight, so it is queued.
        fields.value = { customer_name: 'Second' };
        const queuedSave = draft.save();

        let queuedSettled = false;
        void queuedSave.then(() => {
            queuedSettled = true;
        });

        // The in-flight request comes back as a version conflict, which stops further saving.
        lastRequest('/nscmf/42/draft')?.options.onHttpException?.({
            status: 409,
            data: { code: 'NSCMF_VERSION_CONFLICT', message: 'A newer version exists.' },
        });

        await firstSave;
        await queuedSave;
        await Promise.resolve();

        expect(draft.isConflict.value).toBe(true);
        // A caller awaiting the queued save - FE-28 gates submit on exactly this - must not hang.
        expect(queuedSettled).toBe(true);
    });
});

describe('FE-26 AC4: results_do_not_save_pending_review_via_draft', () => {
    it('omits results from the draft PATCH while the record is in PENDING_REVIEW', () => {
        const fields = ref<ChangeDraftFields>({
            maintenance_purpose: 'Routine check',
            results: [
                {
                    row_no: 1,
                    result_summary: 'Done',
                    performance_information: 'Good',
                    result_status: 'Selesai',
                },
            ],
        });

        const draft = useDraftSave({
            recordId: 77,
            family: 'CHANGE',
            recordVersion: 4,
            businessStatus: 'PENDING_REVIEW',
            fields,
        });

        void draft.save();

        const sent = lastRequest('/nscmf/77/draft')?.data as { change: Record<string, unknown> };
        // 12 §28.2: in PENDING_REVIEW a results key sent to /draft is rejected with 422, so the
        // client must not send one. Results travel through PATCH /change-results instead (12 §29).
        expect('results' in sent.change).toBe(false);
        expect(sent.change.maintenance_purpose).toBe('Routine check');
    });

    it('sends results while the record is still editable', () => {
        const fields = ref<ChangeDraftFields>({
            results: [
                {
                    row_no: 1,
                    result_summary: 'Done',
                    performance_information: 'Good',
                    result_status: 'Selesai',
                },
            ],
        });

        const draft = useDraftSave({
            recordId: 77,
            family: 'CHANGE',
            recordVersion: 4,
            businessStatus: 'REVISION_REQUIRED',
            fields,
        });

        void draft.save();

        const sent = lastRequest('/nscmf/77/draft')?.data as { change: { results?: unknown[] } };
        expect(sent.change.results).toHaveLength(1);
    });
});
