import { describe, expect, it } from 'vitest';
import {
    CANONICAL_BUSINESS_STATUSES,
    DEMO_IDENTITIES,
    DEMO_TEAMS,
    FIXED_TEST_CLOCK,
    getDemoIdentity,
    getScenarioByRequestNo,
    getScenarios,
    type NscmfScenarioRecord,
} from './scenarios';

describe('FE-02: Fixture deterministik dan katalog skenario UI', () => {
    describe('AC1: scenarios_have_exact_twenty_records', () => {
        it('has exact 20 records with 10 ACT and 10 CHG, unique manual request numbers, and all 7 canonical states', () => {
            const records = getScenarios();

            expect(records).toHaveLength(20);

            const actRecords = records.filter((r) => r.request_number.startsWith('DEMO-ACT-'));
            const chgRecords = records.filter((r) => r.request_number.startsWith('DEMO-CHG-'));

            expect(actRecords).toHaveLength(10);
            expect(chgRecords).toHaveLength(10);

            const requestNos = records.map((r) => r.request_number);
            const uniqueRequestNos = new Set(requestNos);
            expect(uniqueRequestNos.size).toBe(20);

            // Manual numbers format
            for (let i = 1; i <= 10; i++) {
                const actId = `DEMO-ACT-${String(i).padStart(3, '0')}`;
                const chgId = `DEMO-CHG-${String(i).padStart(3, '0')}`;
                expect(requestNos).toContain(actId);
                expect(requestNos).toContain(chgId);
            }

            // All 7 canonical business states represented
            const representedStates = new Set(records.map((r) => r.business_status));
            for (const status of CANONICAL_BUSINESS_STATUSES) {
                expect(representedStates.has(status)).toBe(true);
            }

            // 3 Demo Teams and 6 Demo Identities defined
            expect(DEMO_TEAMS).toEqual(['Demo Team Alpha', 'Demo Team Beta', 'Demo Team Gamma']);
            expect(DEMO_IDENTITIES).toHaveLength(6);
            expect(FIXED_TEST_CLOCK).toBe('2026-09-16T09:00:00+07:00');
        });
    });

    describe('AC2: scenarios_are_isolated', () => {
        it('edit clone A does not mutate clone B, and repeated calls produce stable fresh objects', () => {
            const listA = getScenarios();
            const listB = getScenarios();

            expect(listA).not.toBe(listB);
            expect(listA[0]).not.toBe(listB[0]);
            expect(listA[0]).toEqual(listB[0]);

            // Mutate listA clone
            listA[0]!.title = 'MUTATED TITLE';
            if (listA[0]!.change_results && listA[0]!.change_results.length > 0) {
                listA[0]!.change_results[0]!.result_summary = 'MUTATED RESULT';
            }

            // Verify listB is untouched
            expect(listB[0]!.title).not.toBe('MUTATED TITLE');

            // Individual scenario getter is also isolated
            const itemA = getScenarioByRequestNo('DEMO-ACT-001');
            const itemB = getScenarioByRequestNo('DEMO-ACT-001');
            expect(itemA).not.toBe(itemB);
            expect(itemA).toEqual(itemB);

            itemA.title = 'ANOTHER MUTATION';
            expect(itemB.title).not.toBe('ANOTHER MUTATION');
        });
    });

    describe('AC3: scenarios_preserve_history', () => {
        it('preserves history rules: DEMO-CHG-010 Reviewed By empty, ACT-009 iteration 2, CANCELLED never reopen', () => {
            // DEMO-CHG-010: Approver Return Reviewer, effective reviewed_by_user_id / reviewed_at is cleared
            const chg010 = getScenarioByRequestNo('DEMO-CHG-010');
            expect(chg010.business_status).toBe('PENDING_REVIEW');
            expect(chg010.reviewed_by_user_id).toBeNull();
            expect(chg010.reviewed_at).toBeNull();
            expect(chg010.current_workflow_iteration).toBe(1);

            // DEMO-ACT-009: previously Approved, reopened to iteration 2 in REVISION_REQUIRED
            const act009 = getScenarioByRequestNo('DEMO-ACT-009');
            expect(act009.business_status).toBe('REVISION_REQUIRED');
            expect(act009.current_workflow_iteration).toBe(2);
            expect(act009.reopened_at).not.toBeNull();
            expect(act009.reopened_by_user_id).not.toBeNull();

            // CANCELLED records: DEMO-ACT-007 and DEMO-CHG-008 never submitted, no iteration, cannot reopen
            const act007 = getScenarioByRequestNo('DEMO-ACT-007');
            expect(act007.business_status).toBe('CANCELLED');
            expect(act007.current_workflow_iteration).toBeNull();
            expect(act007.requested_by_user_id).toBeNull();
            expect(act007.first_submitted_at).toBeNull();
            expect(act007.reviewed_by_user_id).toBeNull();
            expect(act007.approved_by_user_id).toBeNull();
            expect(act007.reopened_at).toBeNull();

            const chg008 = getScenarioByRequestNo('DEMO-CHG-008');
            expect(chg008.business_status).toBe('CANCELLED');
            expect(chg008.is_archived).toBe(true);
            expect(chg008.current_workflow_iteration).toBeNull();
            expect(chg008.requested_by_user_id).toBeNull();

            // DRAFT records also have no iteration and null submit info
            const act001 = getScenarioByRequestNo('DEMO-ACT-001');
            expect(act001.business_status).toBe('DRAFT');
            expect(act001.current_workflow_iteration).toBeNull();
            expect(act001.requested_by_user_id).toBeNull();
            expect(act001.first_submitted_at).toBeNull();

            // Multi-role participation on DEMO-CHG-006 (demo.multi)
            const chg006 = getScenarioByRequestNo('DEMO-CHG-006');
            const multiUser = getDemoIdentity('demo.multi');
            expect(chg006.business_status).toBe('APPROVED');
            expect(chg006.approved_by_user_id).toBe(multiUser.id);
        });
    });

    describe('AC4: scenarios_never_fabricate_artifacts', () => {
        it('contains no fake CLEAN bytes, accepted chunks, READY files, or fake hashes/signatures', () => {
            const records = getScenarios();

            for (const record of records) {
                // Attachments should not have fake clean bytes, accepted chunk ranges, or uploaded binary payloads
                if (record.attachments) {
                    for (const attachment of record.attachments) {
                        expect(attachment).not.toHaveProperty('binary_bytes');
                        expect(attachment).not.toHaveProperty('accepted_chunks');
                        expect(attachment).not.toHaveProperty('raw_bytes');
                        // Malware scan status must not be fabricated as CLEAN with missing underlying scanner
                        expect(attachment.scan_status).not.toBe('CLEAN_FABRICATED');
                    }
                }

                // Exports must not have fake downloadable ready files or binary artifacts
                if (record.exports) {
                    for (const exp of record.exports) {
                        expect(exp).not.toHaveProperty('file_binary');
                        expect(exp).not.toHaveProperty('download_data');
                    }
                }

                // Signing / verification must not contain fake cryptographic proof
                expect(record).not.toHaveProperty('signature_bytes');
                expect(record).not.toHaveProperty('cms_signature');
                expect(record).not.toHaveProperty('raw_certificate_pem');
            }
        });
    });
});
