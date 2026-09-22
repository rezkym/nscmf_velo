import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import { type JsonResult, sendJson } from '@/lib/http';

import type { ActivationDraftFields, ChangeDraftFields } from './types';
import { type UseDraftSaveOptions, useDraftSave } from './useDraftSave';

// PATCH /nscmf/{record}/draft is a same-origin JSON endpoint (12 §4.2, §26): 200 {data, meta},
// 409/422/401/419 as 12 §9 envelopes. The composable must never read an Inertia page for it.
vi.mock('@/lib/http', () => ({ sendJson: vi.fn() }));

const send = vi.mocked(sendJson);

interface Pending {
    body: unknown;
    resolve: (result: JsonResult) => void;
}

const pending: Pending[] = [];

function hold(): void {
    send.mockImplementation(
        (_method, _url, body) =>
            new Promise<JsonResult>((resolve) => {
                pending.push({ body, resolve });
            }),
    );
}

function ok(version: number, warnings: string[] = []): JsonResult {
    return {
        ok: true,
        status: 200,
        body: {
            data: { id: 7, record_version: version, business_status: 'DRAFT', updated_at: 'x' },
            meta: { warnings },
        },
    };
}

function failure(status: number, code?: string, extra: Record<string, unknown> = {}): JsonResult {
    return { ok: false, status, error: code ? { code, message: '', ...extra } : null };
}

async function settle(index: number, result: JsonResult): Promise<void> {
    pending[index]?.resolve(result);
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();
}

function changeHook(overrides: Partial<UseDraftSaveOptions<ChangeDraftFields>> = {}) {
    const fields = ref<ChangeDraftFields>({ rollback_scenario: 'A' });
    const hook = useDraftSave<ChangeDraftFields>({
        recordId: 7,
        family: 'CHANGE',
        recordVersion: 8,
        businessStatus: 'DRAFT',
        fields,
        ...overrides,
    });
    return { fields, hook };
}

beforeEach(() => {
    pending.length = 0;
    send.mockReset();
    hold();
    vi.useRealTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('AC1: draft_save_uses_ack_version', () => {
    it('sends JSON with the expected version, adopts the acknowledged one and never increments locally', async () => {
        const { fields, hook } = changeHook();

        const first = hook.save();
        expect(send).toHaveBeenCalledWith('PATCH', '/nscmf/7/draft', {
            record_version: 8,
            change: { rollback_scenario: 'A' },
        });
        await settle(0, ok(9));
        await first;

        expect(hook.currentVersion.value).toBe(9);
        expect(hook.saveStatus.value).toBe('saved');
        expect(hook.isDirty.value).toBe(false);

        fields.value = { rollback_scenario: 'B' };
        void hook.save();
        expect((pending[1]?.body as { record_version: number }).record_version).toBe(9);
    });

    it('carries the header block only when the page provides one', async () => {
        const header = ref({ request_date: '2026-09-22', request_no: 'OPS-1' });
        const { hook } = changeHook({ header });

        void hook.save();
        expect(pending[0]?.body).toEqual({
            record_version: 8,
            header: { request_date: '2026-09-22', request_no: 'OPS-1' },
            change: { rollback_scenario: 'A' },
        });
        await settle(0, ok(9));

        header.value = { request_date: '', request_no: 'OPS-1' };
        expect(hook.isDirty.value).toBe(true);
        void hook.save();
        expect((pending[1]?.body as { header: unknown }).header).toEqual({ request_date: null, request_no: 'OPS-1' });
    });

    it('exposes the non-blocking server warnings and reports each acknowledged version', async () => {
        const onSuccess = vi.fn();
        const { hook } = changeHook({ onSuccess });

        const saving = hook.save();
        await settle(0, ok(9, ['No attachment is included.']));
        await saving;

        expect(hook.warnings.value).toEqual(['No attachment is included.']);
        expect(onSuccess).toHaveBeenCalledWith(9);
    });

    it('keeps the current version when a success body carries none', async () => {
        const { hook } = changeHook();
        const saving = hook.save();
        await settle(0, { ok: true, status: 200, body: null });
        await saving;

        expect(hook.currentVersion.value).toBe(8);
        expect(hook.saveStatus.value).toBe('saved');
    });
});

describe('AC2: draft_save_keeps_newer_edits', () => {
    it('keeps an edit typed during the request dirty and never claims Saved for it', async () => {
        const { fields, hook } = changeHook();

        void hook.save();
        fields.value = { rollback_scenario: 'typed while saving' };
        await settle(0, ok(9));

        expect(fields.value).toEqual({ rollback_scenario: 'typed while saving' });
        expect(hook.isDirty.value).toBe(true);
        expect(hook.saveStatus.value).toBeNull();
    });

    it('serializes saves: a save requested in flight runs once afterwards with the new version and data', async () => {
        const { fields, hook } = changeHook();

        const first = hook.save();
        fields.value = { rollback_scenario: 'B' };
        const second = hook.save();
        fields.value = { rollback_scenario: 'C' };
        const third = hook.save();

        expect(send).toHaveBeenCalledTimes(1);
        await settle(0, ok(9));
        expect(send).toHaveBeenCalledTimes(2);
        expect(pending[1]?.body).toEqual({ record_version: 9, change: { rollback_scenario: 'C' } });
        await settle(1, ok(10));
        await Promise.all([first, second, third]);

        expect(hook.currentVersion.value).toBe(10);
        expect(hook.saveStatus.value).toBe('saved');
        expect(send).toHaveBeenCalledTimes(2);
    });
});

describe('AC3: draft_conflict_preserves_unsaved_input', () => {
    it('on 409 stops autosave, keeps input, releases a queued save and never replays the mutation', async () => {
        const onError = vi.fn();
        const { fields, hook } = changeHook({ onError, autosaveInterval: 1000 });

        const first = hook.save();
        fields.value = { rollback_scenario: 'mine' };
        const queued = hook.save();
        await settle(
            0,
            failure(409, 'NSCMF_VERSION_CONFLICT', {
                message: 'A newer version of this record exists.',
                context: { latest_record_version: 12, current_business_status: 'DRAFT' },
            }),
        );
        await Promise.all([first, queued]);

        expect(hook.isConflict.value).toBe(true);
        expect(hook.saveStatus.value).toBe('error');
        expect(hook.conflictError.value).toMatchObject({
            status: 409,
            code: 'NSCMF_VERSION_CONFLICT',
            message: 'A newer version of this record exists.',
        });
        expect(fields.value).toEqual({ rollback_scenario: 'mine' });
        expect(send).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalled();

        await hook.save();
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('treats state and archived conflicts the same way without claiming a newer version', async () => {
        const { hook } = changeHook();
        const saving = hook.save();
        await settle(0, failure(409, 'NSCMF_STATE_CONFLICT'));
        await saving;

        expect(hook.isConflict.value).toBe(true);
        expect(hook.conflictError.value?.message).toBe('This record changed. Refresh to see the latest version.');
    });

    it('clears the conflict and adopts the version handed to resolveConflict, or the one in the context', async () => {
        const { hook } = changeHook();
        const saving = hook.save();
        await settle(0, failure(409, 'NSCMF_VERSION_CONFLICT', { context: { latest_record_version: 15 } }));
        await saving;

        hook.resolveConflict();
        expect(hook.isConflict.value).toBe(false);
        expect(hook.currentVersion.value).toBe(15);

        hook.resolveConflict(20);
        expect(hook.currentVersion.value).toBe(20);
    });
});

describe('AC4: draft_failure_is_not_success', () => {
    it.each([
        [0, undefined, 'network'],
        [401, 'AUTHENTICATION_REQUIRED', 'session'],
        [419, 'SESSION_EXPIRED', 'csrf'],
        [403, 'FORBIDDEN', 'forbidden'],
        [500, 'SERVER_ERROR', 'server'],
        [503, undefined, 'unavailable'],
    ])('status %s never counts as saved', async (status, code) => {
        const { fields, hook } = changeHook();
        const saving = hook.save();
        await settle(0, failure(status, code));
        await saving;

        expect(hook.saveStatus.value).toBe('error');
        expect(hook.isDirty.value).toBe(true);
        expect(hook.isConflict.value).toBe(false);
        expect(hook.feedbackError.value?.status).toBe(status);
        expect(fields.value).toEqual({ rollback_scenario: 'A' });
        if (status === 0) expect(hook.feedbackError.value?.isNetworkError).toBe(true);
    });

    it('surfaces 422 field errors keyed by wire path and keeps the input', async () => {
        const { fields, hook } = changeHook();
        const saving = hook.save();
        await settle(
            0,
            failure(422, 'VALIDATION_FAILED', {
                message: 'Some fields need to be corrected.',
                errors: { 'change.monitoring_period_unit': ['Give the monitoring period amount and unit together.'] },
            }),
        );
        await saving;

        expect(hook.validationErrors.value).toEqual({
            'change.monitoring_period_unit': ['Give the monitoring period amount and unit together.'],
        });
        expect(hook.feedbackError.value).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
        expect(fields.value).toEqual({ rollback_scenario: 'A' });
        expect(hook.isConflict.value).toBe(false);
    });

    it('clears old field errors on the next successful save', async () => {
        const { hook } = changeHook();
        const first = hook.save();
        await settle(0, failure(422, 'VALIDATION_FAILED', { errors: { x: ['bad'] } }));
        await first;
        const second = hook.save();
        await settle(1, ok(9));
        await second;

        expect(hook.validationErrors.value).toBeNull();
        expect(hook.feedbackError.value).toBeNull();
    });

    it('does not wedge when the payload cannot be built', async () => {
        const fields = ref<ActivationDraftFields>({ sla_items: [{ row_no: 9, requirement_text: 'x' }] });
        const hook = useDraftSave<ActivationDraftFields>({
            recordId: 1,
            family: 'ACTIVATION',
            recordVersion: 1,
            businessStatus: 'DRAFT',
            fields,
        });

        await expect(hook.save()).rejects.toThrow('sla_items: invalid row_no 9.');
        expect(hook.isSaving.value).toBe(false);
        expect(send).not.toHaveBeenCalled();

        fields.value = { sla_items: [{ row_no: 1, requirement_text: 'x' }] };
        void hook.save();
        expect(send).toHaveBeenCalledTimes(1);
    });
});

describe('AC5: draft_serializes_whole_sets', () => {
    it('serializes Activation collections by natural key with blank-to-null and sites', () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: '  ',
            references: [{ reference_type: 'IWO', specification: '' }],
            sla_items: [
                { row_no: 1, requirement_text: 'Uptime' },
                { row_no: 2, requirement_text: '' },
            ],
            direct_site: null,
        });
        const hook = useDraftSave<ActivationDraftFields>({
            recordId: 3,
            family: 'ACTIVATION',
            recordVersion: 2,
            businessStatus: 'DRAFT',
            fields,
        });

        void hook.save();

        expect(send).toHaveBeenCalledWith('PATCH', '/nscmf/3/draft', {
            record_version: 2,
            activation: {
                customer_name: null,
                references: [{ reference_type: 'IWO', specification: null }],
                sla_items: [{ row_no: 1, requirement_text: 'Uptime' }],
                direct_site: null,
            },
        });
    });

    it('withholds results from the Draft save outside DRAFT and REVISION_REQUIRED (12 §28.2)', () => {
        const fields = ref<ChangeDraftFields>({
            rollback_scenario: 'x',
            results: [{ row_no: 1, result_summary: 'r' }],
        });
        const status = ref<'DRAFT' | 'PENDING_REVIEW'>('PENDING_REVIEW');
        const hook = useDraftSave<ChangeDraftFields>({
            recordId: 5,
            family: 'CHANGE',
            recordVersion: 4,
            businessStatus: status,
            fields,
        });

        void hook.save();
        expect(pending[0]?.body).toEqual({ record_version: 4, change: { rollback_scenario: 'x' } });
    });
});

describe('autosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('starts only when there is something to save and restarts the debounce on each edit', () => {
        const { fields } = changeHook({ autosaveInterval: 1000 });

        vi.advanceTimersByTime(5000);
        expect(send).not.toHaveBeenCalled();

        fields.value = { rollback_scenario: 'B' };
        vi.advanceTimersByTime(600);
        fields.value = { rollback_scenario: 'BC' };
        vi.advanceTimersByTime(600);
        expect(send).not.toHaveBeenCalled();
        vi.advanceTimersByTime(400);
        expect(send).toHaveBeenCalledTimes(1);
        expect((pending[0]?.body as { change: unknown }).change).toEqual({ rollback_scenario: 'BC' });
    });

    it('cancels the pending tick when an edit returns to the saved value', () => {
        const { fields, hook } = changeHook({ autosaveInterval: 1000 });

        fields.value = { rollback_scenario: 'B' };
        fields.value = { rollback_scenario: 'A' };
        vi.advanceTimersByTime(2000);

        expect(hook.isDirty.value).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });

    it('does not autosave during a conflict, while stopped, or while disabled', async () => {
        const enabled = ref(false);
        const { fields, hook } = changeHook({ autosaveInterval: 1000, enabled });

        fields.value = { rollback_scenario: 'B' };
        vi.advanceTimersByTime(2000);
        expect(send).not.toHaveBeenCalled();

        enabled.value = true;
        hook.stopAutosave();
        fields.value = { rollback_scenario: 'C' };
        vi.advanceTimersByTime(2000);
        expect(send).not.toHaveBeenCalled();

        hook.startAutosave();
        vi.advanceTimersByTime(1000);
        expect(send).toHaveBeenCalledTimes(1);
        await settle(0, failure(409, 'NSCMF_VERSION_CONFLICT'));

        fields.value = { rollback_scenario: 'D' };
        vi.advanceTimersByTime(5000);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('skips a tick while a save is in flight instead of stacking requests', () => {
        const { fields, hook } = changeHook({ autosaveInterval: 1000 });

        void hook.save();
        fields.value = { rollback_scenario: 'B' };
        vi.advanceTimersByTime(2000);

        expect(send).toHaveBeenCalledTimes(1);
    });

    it('stops its timer when the owning component unmounts', () => {
        const fields = ref<ChangeDraftFields>({ rollback_scenario: 'A' });
        const Host = defineComponent({
            setup() {
                useDraftSave<ChangeDraftFields>({
                    recordId: 1,
                    family: 'CHANGE',
                    recordVersion: 1,
                    businessStatus: 'DRAFT',
                    fields,
                    autosaveInterval: 1000,
                });
                return () => h('div');
            },
        });
        const wrapper = mount(Host);

        fields.value = { rollback_scenario: 'B' };
        wrapper.unmount();
        vi.advanceTimersByTime(5000);

        expect(send).not.toHaveBeenCalled();
    });
});

describe('resync after an explicit refresh', () => {
    it('adopts the server version and treats the reloaded fields as saved', async () => {
        const { fields, hook } = changeHook();
        const saving = hook.save();
        await settle(0, failure(409, 'NSCMF_VERSION_CONFLICT'));
        await saving;

        fields.value = { rollback_scenario: 'from server' };
        hook.resync(14);

        expect(hook.isConflict.value).toBe(false);
        expect(hook.feedbackError.value).toBeNull();
        expect(hook.saveStatus.value).toBeNull();
        expect(hook.isDirty.value).toBe(false);
        expect(hook.currentVersion.value).toBe(14);
    });
});
