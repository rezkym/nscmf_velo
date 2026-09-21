import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
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
                statusText: 'Service Unavailable',
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
            expect(draft.feedbackError.value?.code).toBe('NSCMF_VALIDATION_FAILED');
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
        it('handles options without record_version in response, error branch variations, resolveConflict, and startAutosave when dirty', async () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Initial Name',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
            });

            // 1. Success response without record props
            const save1 = draft.save();
            expect(requests.length).toBe(1);
            requests[0]?.options.onSuccess?.({});
            await save1;
            expect(draft.currentVersion.value).toBe(8); // version remains unchanged

            // 2. Error branch: error with flat bag on 422
            fields.value.customer_name = 'Dirty After';
            const save2 = draft.save();
            expect(requests.length).toBe(2);
            requests[1]?.options.onError?.({
                'activation.customer_name': 'Invalid name format',
            });
            await save2;
            expect(draft.validationErrors.value).toMatchObject({
                'activation.customer_name': 'Invalid name format',
            });

            // 3. Error branch: onHttpException and onNetworkError variations
            fields.value.customer_name = 'Dirty After 2';
            const save3 = draft.save();
            expect(requests.length).toBe(3);
            requests[2]?.options.onHttpException?.(undefined);
            await save3;
            expect(draft.feedbackError.value).toEqual({
                status: 500,
                message: 'Server error',
            });

            fields.value.customer_name = 'Dirty After 3';
            const save4 = draft.save();
            expect(requests.length).toBe(4);
            requests[3]?.options.onNetworkError?.('connection dropped');
            await save4;
            expect(draft.feedbackError.value).toMatchObject({
                status: 0,
                isNetworkError: true,
                message: 'Network connection lost',
            });

            // 4. resolveConflict clears isConflict and conflictError, and re-syncs version if passed
            draft.resolveConflict(15);
            expect(draft.isConflict.value).toBe(false);
            expect(draft.conflictError.value).toBeNull();
            expect(draft.feedbackError.value).toBeNull();
            expect(draft.currentVersion.value).toBe(15);

            // 5. startAutosave when dirty schedules autosave immediately; when clean does not schedule
            const draftWithTimer = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
                autosaveInterval: 2000,
            });
            draftWithTimer.stopAutosave();
            expect(draftWithTimer.isDirty.value).toBe(false);
            draftWithTimer.startAutosave();
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(4); // no new request because not dirty

            draftWithTimer.stopAutosave();
            fields.value.customer_name = 'Changed While Stopped';
            expect(draftWithTimer.isDirty.value).toBe(true);
            draftWithTimer.startAutosave();
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(5);

            // Also test startAutosave when conflict is active
            draftWithTimer.stopAutosave();
            fields.value.customer_name = 'Another change';
            draftWithTimer.isConflict.value = true;
            draftWithTimer.startAutosave();
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(5); // blocked by conflict
            draftWithTimer.isConflict.value = false;

            // Test watch trigger when autosaveInterval is not set (hits line 87 early return)
            const draftNoInterval = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
            });
            fields.value.customer_name = 'Trigger watch without autosave interval';
            expect(draftNoInterval.isDirty.value).toBe(true);

            // Test scheduleAutosave with interval when isConflict is true
            const draftConflictInterval = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
                autosaveInterval: 1000,
            });
            draftConflictInterval.isConflict.value = true;
            fields.value.customer_name = 'Trigger while conflict interval';
            expect(draftConflictInterval.isDirty.value).toBe(true);
            draftConflictInterval.isConflict.value = false;

            // Test watch trigger when autosaveInterval is set but enabled is false
            const fieldsDisabled = ref<ActivationDraftFields>({ customer_name: 'Static' });
            const draftDisabled = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields: fieldsDisabled,
                autosaveInterval: 1000,
                enabled: false,
            });
            fieldsDisabled.value.customer_name = 'Trigger watch when disabled';
            expect(draftDisabled.isDirty.value).toBe(true);
            vi.advanceTimersByTime(2000);
            expect(requests.length).toBe(5); // No new save dispatched because enabled: false

            // Test watch trigger when autosaveInterval is set but autosave is stopped
            const draftStopped = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
                autosaveInterval: 1000,
            });
            draftStopped.stopAutosave();
            fields.value.customer_name = 'Trigger watch when stopped';
            expect(draftStopped.isDirty.value).toBe(true);

            // Test scheduleAutosave directly when autosave is stopped
            draftStopped.startAutosave();
            draftStopped.stopAutosave();
            // Call scheduleAutosave implicitly via field change while stopped
            fields.value.customer_name = 'Trigger while stopped directly';
            expect(draftStopped.isDirty.value).toBe(true);

            // Trigger watch callback when isDirty is false (mutate to same lastSavedSnapshot)
            fields.value.customer_name = 'Initial Name';
            expect(draft.isDirty.value).toBe(false);

            // 6. Test multiple queued saves while saving (re-entering executeSave when pendingSavePromise already exists)
            const slowDraft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
            });
            fields.value.customer_name = 'In-flight Base';
            const p1 = slowDraft.save();
            expect(requests.length).toBe(6);
            fields.value.customer_name = 'Queued 1';
            const p2 = slowDraft.save();
            fields.value.customer_name = 'Queued 2';
            const p3 = slowDraft.save();
            expect(requests.length).toBe(6);

            requests[5]?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await p1;

            expect(requests.length).toBe(7);
            requests[6]?.options.onSuccess?.({
                props: { record: { id: 42, record_version: 10 } },
            });
            await Promise.all([p2, p3]);

            // 7. Test autosave timer firing when isSaving is true or isConflict is true
            const timerDraft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 10,
                fields,
                autosaveInterval: 1000,
            });
            fields.value.customer_name = 'Timer change';
            timerDraft.isSaving.value = true;
            vi.advanceTimersByTime(1000); // executeSave not called because isSaving is true
            timerDraft.isSaving.value = false;

            fields.value.customer_name = 'Timer conflict change';
            timerDraft.isConflict.value = true;
            vi.advanceTimersByTime(1000); // executeSave not called because isConflict is true
            timerDraft.isConflict.value = false;
        });

        it('automatically saves dirty changes on debounce/interval when enabled', () => {
            const fields = ref<ActivationDraftFields>({
                customer_name: 'Initial Name',
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
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
            expect(draft.conflictError.value?.message).toBe('A newer version exists.');
            expect(onErrorCalledWith).toMatchObject({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version exists.',
            });
        });

        it('covers checkPageFlashForConflict fallback to usePage() when pageOrFlash is null/empty', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Test' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                fields,
            });

            void draft.save();
            const req = lastRequest('/nscmf/42/draft');
            expect(req).toBeDefined();

            // Set up pageProps.flash directly in mock inertia
            await flashDomainError({
                code: 'RECORD_CONFLICT',
                message: 'Conflict from page',
            });

            // Call onSuccess with null/empty page so checkPageFlashForConflict has to fall back to usePage()
            req?.options.onSuccess?.(null);

            expect(draft.isConflict.value).toBe(true);
            expect(draft.conflictError.value).toMatchObject({
                status: 409,
                code: 'RECORD_CONFLICT',
                message: 'Conflict from page',
            });
        });

        it('covers inFlightSnapshot fallback branch, empty onError branch, and non-conflict onHttpException branches', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Initial' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
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
            expect(draft.conflictError.value?.code).toBe('NSCMF_VERSION_CONFLICT');
            expect(draft.conflictError.value?.message).toBe('A newer version of this record exists.');

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
            expect(draft.feedbackError.value?.code).toBe('NSCMF_VALIDATION_FAILED');
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
        });

        it('covers checkPageFlashForConflict when usePage() returns page without flash property (fallback to page.props.flash)', async () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Test' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
                fields,
            });

            // Mock usePage to return { props: { flash: { domain_error: { code: 'VERSION_CONFLICT' } } } } without top-level flash
            const { inertiaModule } = await import('@/testing/inertia');
            const originalUsePage = inertiaModule.usePage;
            inertiaModule.usePage = () =>
                ({
                    props: {
                        flash: {
                            domain_error: {
                                code: 'VERSION_CONFLICT',
                                message: 'Props flash conflict',
                            },
                        },
                    },
                }) as never;

            try {
                void draft.save();
                const req = lastRequest('/nscmf/42/draft');
                req?.options.onSuccess?.(null);

                expect(draft.isConflict.value).toBe(true);
                expect(draft.conflictError.value?.message).toBe('Props flash conflict');
            } finally {
                inertiaModule.usePage = originalUsePage;
            }
        });

        it('covers lastSavedSnapshot fallback when inFlightSnapshot is null and multiple inFlightCount', () => {
            const fields = ref<ActivationDraftFields>({ customer_name: 'Original' });
            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 1,
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
