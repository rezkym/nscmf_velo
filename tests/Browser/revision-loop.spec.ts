import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { createChangeDraft, fillSubmittableChange, openFromHistory, openOwnFromDashboard } from './support/nscmf';
import { createBrowserUser, runQueuedJobs, type BrowserUser } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * The return loops of 05 §9, §16–17 and 03 UF-REVIEW-005 / UF-APPROVAL-004 driven only by clicks:
 * a returned record is revised on the SAME record (same Request No, same iteration) and
 * resubmitted, any number of times. Plus the lifecycle journeys of 16 §74 that were not driven
 * end to end: Cancel, Reject, Archive/Unarchive and Reopen (03 UF-DRAFT-004, UF-REOPEN, UF-ARCHIVE).
 */

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Sidebar Menu' });

async function signOut(page: Page): Promise<void> {
    await page.getByTestId('btn-logout').click();
    await expect(page).toHaveURL(/\/login$/);
}

async function confirmDialog(page: Page, text?: string): Promise<void> {
    const dialog = page.getByRole('dialog');
    if (text !== undefined) await dialog.locator('textarea').fill(text);
    await dialog.locator('[data-test="confirm-button"]').click();
    await expect(dialog).toHaveCount(0);
}

async function openQueued(page: Page, queue: 'Review' | 'Approval', id: string): Promise<void> {
    await sidebar(page).getByRole('link', { name: queue }).click();
    await page.getByTestId(`btn-view-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/${queue.toLowerCase()}/${id}$`));
}

async function as(page: Page, user: BrowserUser, steps: () => Promise<void>): Promise<void> {
    await loginToDashboard(page, user.username, user.password);
    await steps();
    await signOut(page);
}

/** The owner records a Result while the record is in review (07 §26), reached from the record. */
async function recordResult(page: Page, recordPath: string): Promise<void> {
    await openFromHistory(page, recordPath);
    await page.getByTestId('next-step-results').click();
    await page.getByTestId('btn-add-row').first().click();
    await page.locator('#results-0-result_summary').fill('Module replaced, service restored.');
    await page.locator('#results-0-performance_information').fill('Zero errors for 72 hours.');
    await page.locator('#results-0-result_status').fill('Completed');
    const saved = page.waitForResponse((response) => response.url().includes('/change-results'));
    await page.getByTestId('submit-results-btn').click();
    expect((await saved).status()).toBe(200);
}

/** Revises the returned record from the Dashboard card and resubmits it; checks the reason shown. */
async function reviseAndResubmit(page: Page, recordPath: string, reason: string, rollback: string): Promise<void> {
    await openOwnFromDashboard(page, 'card-revisions', recordPath);
    await expect(page.getByTestId('revision-notice')).toContainText(reason);
    await page.locator('#rollback_scenario').fill(rollback);
    await page.getByTestId('btn-save-draft').click();
    await expect(page.getByTestId('save-status-indicator')).toContainText('Saved');
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    await expect(page.getByTestId('business-status-badge')).toHaveText('Pending Review');
}

test('a returned record is revised and resubmitted on the same record, by clicks only, until approved', async ({
    page,
}) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });
    const approver = createBrowserUser({ roles: ['Approver'], team: true });
    const superadmin = createBrowserUser({ roles: ['Superadmin'] });

    let recordPath = '';
    let requestNo = '';
    await as(page, requester, async () => {
        recordPath = await createChangeDraft(page);
        await fillSubmittableChange(page);
        await page.getByTestId('submit-button').click();
        await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
        requestNo = (await page.getByTestId('request-no').innerText()).trim();
    });
    const id = recordPath.split('/').pop() ?? '';

    // Reviewer: Return for Revision (05 §14).
    await as(page, reviewer, async () => {
        await openQueued(page, 'Review', id);
        await page.getByTestId('review-return').click();
        await confirmDialog(page, 'Name the owner of the rollback.');
    });

    // Anyone else, even a Superadmin, only sees that the record waits for its requester (05 §30).
    await as(page, superadmin, async () => {
        await openFromHistory(page, recordPath);
        await expect(page.getByTestId('business-status-badge')).toHaveText('Revision Required');
        await expect(page.getByTestId('next-step-waiting')).toBeVisible();
        await expect(page.getByTestId('next-step-edit')).toHaveCount(0);
        await expect(page.locator('[data-testid^="lifecycle-"]:is(button)')).toHaveCount(0);
    });

    // Requester: revises the same record, adds an attachment in revision (05 §9), resubmits.
    await as(page, requester, async () => {
        await openOwnFromDashboard(page, 'card-revisions', recordPath);
        await page
            .getByTestId('attachment-input')
            .setInputFiles(path.resolve(import.meta.dirname, 'fixtures/plan.txt'));
        await expect(page.getByTestId('upload-plan.txt')).toContainText('Scanning');
        runQueuedJobs();
        await expect(page.getByTestId('upload-plan.txt')).toContainText('Processed', { timeout: 15_000 });
        await reviseAndResubmit(
            page,
            recordPath,
            'Name the owner of the rollback.',
            'NOC shift lead restores the module.',
        );
        await expect(page.getByTestId('request-no')).toHaveText(requestNo);
        await recordResult(page, recordPath);
    });

    // Reviewer forwards; Approver returns it to the Requester (05 §10).
    await as(page, reviewer, async () => {
        await openQueued(page, 'Review', id);
        await page.getByTestId('review-forward').click();
        await confirmDialog(page);
    });
    await as(page, approver, async () => {
        await openQueued(page, 'Approval', id);
        await page.getByTestId('approval-return-requester').click();
        await expect(page.getByRole('dialog')).toContainText('Return to Requester');
        await confirmDialog(page, 'State the maintenance window.');
    });

    // Second revision loop on the same record, then Forward and Approve.
    await as(page, requester, async () => {
        await reviseAndResubmit(page, recordPath, 'State the maintenance window.', 'Rollback within the 02:00 window.');
        await expect(page.getByTestId('request-no')).toHaveText(requestNo);
    });
    await as(page, reviewer, async () => {
        await openQueued(page, 'Review', id);
        await page.getByTestId('review-forward').click();
        await confirmDialog(page);
    });
    await loginToDashboard(page, approver.username, approver.password);
    await openQueued(page, 'Approval', id);
    await page.getByTestId('approval-approve').click();
    await confirmDialog(page, 'Looks good.');
    await expect(page.getByTestId('business-status-badge')).toHaveText('Approved');
    await expect(page.getByTestId('request-no')).toHaveText(requestNo);
    await expect(page.getByTestId('signoff-requested-by')).toContainText(requester.name);

    // Still one iteration: two returns and resubmits never start a new one (05 §16).
    await page.getByTestId('tab-timeline').click();
    const groups = page.getByTestId('timeline-group');
    await expect(groups.getByRole('heading', { name: 'Iteration 1' })).toBeVisible();
    await expect(groups.getByRole('heading', { name: 'Iteration 2' })).toHaveCount(0);
});

test('an own Draft is cancelled after an explicit confirmation', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });

    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await openOwnFromDashboard(page, 'card-drafts', recordPath);
    await page.getByRole('link', { name: 'View record' }).click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    await page.getByTestId('lifecycle-cancel').click();
    await confirmDialog(page, 'No longer needed.');

    await expect(page.getByTestId('business-status-badge')).toHaveText('Cancelled');
    await expect(page.getByTestId('next-step-edit')).toHaveCount(0);
    await expect(page.getByTestId('lifecycle-cancel')).toHaveCount(0);
});

test('a rejected record is archived, unarchived and reopened for revision into a new iteration', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });
    const steward = createBrowserUser({
        permissions: ['nscmf.view', 'nscmf.view.history', 'nscmf.timeline.view', 'nscmf.archive', 'nscmf.reopen'],
    });

    let recordPath = '';
    await as(page, requester, async () => {
        recordPath = await createChangeDraft(page);
        await fillSubmittableChange(page);
        await page.getByTestId('submit-button').click();
        await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    });
    const id = recordPath.split('/').pop() ?? '';

    await as(page, reviewer, async () => {
        await openQueued(page, 'Review', id);
        await page.getByTestId('review-reject').click();
        await confirmDialog(page, 'The change window is not approved.');
        await expect(page.getByTestId('business-status-badge')).toHaveText('Rejected');
    });

    await as(page, steward, async () => {
        await openFromHistory(page, recordPath);
        await page.getByTestId('lifecycle-archive').click();
        await confirmDialog(page, 'Closed out for now.');
        await expect(page.getByTestId('archived-badge')).toHaveText('Archived');
        await expect(page.getByTestId('lifecycle-unarchive-first')).toBeVisible();

        await page.getByTestId('lifecycle-unarchive').click();
        await confirmDialog(page, 'Needed again.');
        await expect(page.getByTestId('archived-badge')).toHaveCount(0);
        await expect(page.getByTestId('business-status-badge')).toHaveText('Rejected');

        await page.getByTestId('lifecycle-reopen-revision').click();
        await confirmDialog(page, 'Rework with an approved window.');
        await expect(page.getByTestId('business-status-badge')).toHaveText('Revision Required');
        await page.getByTestId('tab-timeline').click();
        await expect(page.getByTestId('timeline-group').getByRole('heading', { name: 'Iteration 2' })).toBeVisible();
    });

    // The requester finds it back in their Revision card and can revise it.
    await loginToDashboard(page, requester.username, requester.password);
    await openOwnFromDashboard(page, 'card-revisions', recordPath);
    await expect(page.getByTestId('revision-notice')).toContainText('Rework with an approved window.');
});
