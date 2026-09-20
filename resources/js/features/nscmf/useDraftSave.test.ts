import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { lastRequest, requests, resetInertia, router } from '@/testing/inertia';
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

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
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
            requests[0].options.onSuccess?.({
                props: { record: { id: 42, record_version: 9 } },
            });
            await save1;

            // Now second request should be dispatched automatically or queue emptied with latest payload
            expect(requests.length).toBe(2);
            expect(requests[1].data).toMatchObject({
                record_version: 9,
                activation: { customer_name: 'Second Edit' },
            });

            requests[1].options.onSuccess?.({
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

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
                autosaveInterval: 3000,
            });

            // Start autosave
            vi.advanceTimersByTime(3000);
            expect(requests.length).toBe(1);

            const req = requests[0];
            // Simulate 409 conflict
            req.options.onError?.({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version exists.',
                context: {
                    latest_record_version: 10,
                },
            });

            expect(draft.isConflict.value).toBe(true);
            expect(draft.conflictError.value).toMatchObject({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
            });
            expect(draft.saveStatus.value).toBe('error');
            // Unsaved input is preserved in fields
            expect(fields.value.customer_name).toBe('My Unsaved Work');

            // Crucial: Autosave MUST stop! Timer advancing must NOT trigger another request
            vi.advanceTimersByTime(10000);
            expect(requests.length).toBe(1); // No new request dispatched

            // Even if user types more, autosave remains halted while in conflict
            fields.value.customer_name = 'Still More Work';
            vi.advanceTimersByTime(5000);
            expect(requests.length).toBe(1);

            // User has options to resolve: e.g. acknowledge or refresh
            expect(typeof draft.resolveConflict).toBe('function');
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

            // 1. Network failure
            const save1 = draft.save();
            requests[0].options.onError?.({
                status: 0,
                isNetworkError: true,
                message: 'Network connection lost',
            });
            await save1;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.feedbackError.value).toMatchObject({
                isNetworkError: true,
            });
            expect(draft.isSaving.value).toBe(false);

            // Retry explicitly
            const retry1 = draft.retry();
            expect(requests.length).toBe(2);

            // 2. 503 Service Unavailable
            requests[1].options.onError?.({
                status: 503,
                message: 'Service Unavailable',
            });
            await retry1;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.feedbackError.value).toMatchObject({
                status: 503,
            });

            // 3. 422 Validation Error
            const retry2 = draft.retry();
            expect(requests.length).toBe(3);
            requests[2].options.onError?.({
                status: 422,
                code: 'NSCMF_VALIDATION_FAILED',
                message: 'Draft payload validation error',
                errors: {
                    'activation.lan_ip_allocation': ['Invalid IP format'],
                },
            });
            await retry2;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.validationErrors.value).toMatchObject({
                'activation.lan_ip_allocation': ['Invalid IP format'],
            });
            expect(draft.feedbackError.value?.status).toBe(422);
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

    describe('Autosave lifecycle & timers', () => {
        it('automatically saves dirty changes on debounce/interval when enabled', async () => {
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

            requests[0].options.onSuccess?.({
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

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
                autosaveInterval: 3000,
            });

            fields.value.customer_name = 'Paused Test';
            draft.stopAutosave();

            vi.advanceTimersByTime(5000);
            expect(requests.length).toBe(0);

            draft.startAutosave();
            vi.advanceTimersByTime(3000);
            expect(requests.length).toBe(1);
        });
    });
});
