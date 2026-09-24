import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { createChangeDraft, fillSubmittableChange } from './support/nscmf';
import {
    createBrowserUser,
    prepareBrowserRuntime,
    provisionExports,
    runQueuedJobs,
    type BrowserUser,
} from './support/runtime';
import { login, loginToDashboard } from './support/session';

/*
 * FE-55 critical journeys against the real server, database, queue, ClamAV, LibreOffice and
 * OpenSSL signer. Every actor is a fresh synthetic account; nothing depends on the demo seed.
 */

const workbook = path.resolve(import.meta.dirname, '../../NSCMF-Form-3.0.xlsx');

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

/** Requester submits a Change and records its Result; returns the record path, e.g. /nscmf/4. */
async function submittedChange(page: Page, requester: BrowserUser): Promise<string> {
    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await fillSubmittableChange(page);
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));

    await page.goto(`${recordPath}/edit`);
    await page.getByTestId('btn-add-row').first().click();
    await page.locator('#results-0-result_summary').fill('Module replaced, service restored.');
    await page.locator('#results-0-performance_information').fill('Zero errors for 72 hours.');
    await page.locator('#results-0-result_status').fill('Completed');
    const saved = page.waitForResponse((response) => response.url().includes('/change-results'));
    await page.getByTestId('submit-results-btn').click();
    expect((await saved).status()).toBe(200);
    await signOut(page);

    return recordPath;
}

/** Reviewer forwards and approver approves, each from their own detail page. */
async function reviewAndApprove(page: Page, recordPath: string, reviewer: BrowserUser, approver: BrowserUser) {
    const id = recordPath.split('/').pop() ?? '';
    await loginToDashboard(page, reviewer.username, reviewer.password);
    await page.goto(`/review/${id}`);
    await page.getByTestId('review-forward').click();
    await confirmDialog(page);
    await signOut(page);

    await loginToDashboard(page, approver.username, approver.password);
    await page.goto('/approval');
    await page.getByTestId(`btn-view-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/approval/${id}$`));
    await page.getByTestId('approval-approve').click();
    await confirmDialog(page, 'Looks good.');
    await expect(page.getByTestId('business-status-badge')).toHaveText('Approved');
}

test('AC1: a Change goes from Draft through review and approval to History and the archive', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });
    const approver = createBrowserUser({ roles: ['Approver'], team: true });
    const archivist = createBrowserUser({ permissions: ['nscmf.view', 'nscmf.view.history', 'nscmf.archive'] });

    const recordPath = await submittedChange(page, requester);
    await reviewAndApprove(page, recordPath, reviewer, approver);
    await expect(page.getByTestId('signoff-reviewed-by')).toContainText(reviewer.name);
    await expect(page.getByTestId('signoff-approved-by')).toContainText(approver.name);
    await signOut(page);

    await loginToDashboard(page, archivist.username, archivist.password);
    await page.goto(recordPath);
    await page.getByTestId('lifecycle-archive').click();
    await confirmDialog(page, 'Filed after closure.');
    await expect(page.getByTestId('archived-badge')).toHaveText('Archived');
    await expect(page.getByTestId('business-status-badge')).toHaveText('Approved');

    await page.goto('/history');
    await expect(page.locator(`a[href="${recordPath}"]`)).toHaveCount(0);
    await page.getByTestId('filter-archived').selectOption('1');
    await expect(page.locator(`a[href="${recordPath}"]`)).toHaveCount(1);
});

test('AC2: an actor without the permission can neither open nor act on an approval', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });
    const recordPath = await submittedChange(page, requester);
    const id = recordPath.split('/').pop() ?? '';

    await loginToDashboard(page, reviewer.username, reviewer.password);
    await page.goto(`/review/${id}`);
    await page.getByTestId('review-forward').click();
    await confirmDialog(page);

    const opened = await page.goto(`/approval/${id}`);
    expect(opened?.status()).toBe(403);
    await page.goto('/dashboard');
    const approve = await page.evaluate(async (target) => {
        const token = decodeURIComponent(document.cookie.split('XSRF-TOKEN=')[1]?.split(';')[0] ?? '');
        const response = await fetch(`/nscmf/${target}/approval/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': token },
            body: JSON.stringify({ record_version: 99 }),
        });
        return response.status;
    }, id);
    expect(approve).toBe(403);
});

test('AC3: an attachment is scanned before download, and an Approved PDF is signed and verifies publicly', async ({
    page,
}) => {
    test.skip(!existsSync(workbook), 'The private official workbook is not provisioned.');
    provisionExports();
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });
    const approver = createBrowserUser({ roles: ['Approver'], team: true });

    // Attachment: uploaded in chunks, scanned by the real clamd, only then downloadable.
    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await page.getByTestId('attachment-input').setInputFiles(path.resolve(import.meta.dirname, 'fixtures/plan.txt'));
    await expect(page.getByTestId('upload-plan.txt')).toContainText('Scanning');
    runQueuedJobs();
    await expect(page.getByTestId('upload-plan.txt')).toContainText('Processed', { timeout: 15_000 });
    await expect(page.locator('[data-testid^="attachment-download-"]')).toHaveCount(1);
    await signOut(page);

    // Approved PDF: generated from the official template, signed, then checked on /ispdfvalid.
    await loginToDashboard(page, requester.username, requester.password);
    await page.goto(`${recordPath}/edit`);
    await fillSubmittableChange(page);
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    await page.goto(`${recordPath}/edit`);
    await page.getByTestId('btn-add-row').first().click();
    await page.locator('#results-0-result_summary').fill('Module replaced.');
    await page.locator('#results-0-performance_information').fill('No errors.');
    await page.locator('#results-0-result_status').fill('Completed');
    await page.getByTestId('submit-results-btn').click();
    await expect(page.getByTestId('submit-results-btn')).toBeEnabled();
    await signOut(page);
    await reviewAndApprove(page, recordPath, reviewer, approver);
    await signOut(page);

    await loginToDashboard(page, requester.username, requester.password);
    await page.goto(recordPath);
    await page.getByTestId('export-PDF').click();
    const job = page.locator('[data-testid^="export-job-"]').first();
    await expect(job).toContainText('Queued');
    runQueuedJobs();
    await expect(job).toContainText('Ready', { timeout: 30_000 });
    await expect(job).toContainText('Signed with the NSCMF Organization certificate.');
    const download = page.waitForEvent('download');
    await page.locator('[data-testid^="export-download-"]').first().click();
    const pdfPath = test.info().outputPath('nscmf.pdf');
    await (await download).saveAs(pdfPath);

    await page.goto('/ispdfvalid');
    await expect(page.getByRole('link')).toHaveCount(0);
    await page.getByTestId('validator-file').setInputFiles(pdfPath);
    await page.getByTestId('validator-verify').click();
    await expect(page.getByTestId('validator-result')).toContainText('Valid and current', { timeout: 30_000 });
});

test('AC4: the protected setting needs a fresh password, and a cancelled prompt changes nothing', async ({ page }) => {
    // There is one protected identity per installation, so this journey starts from a fresh runtime
    // that is past initial setup (an active Team with a working user).
    prepareBrowserRuntime();
    createBrowserUser({ roles: ['Requester'], team: true });
    const superadmin = createBrowserUser({ roles: ['Superadmin'], protectedSuperadmin: true });
    await login(page, superadmin.username, superadmin.password);
    await page.goto('/administration/settings/technical-logs');
    const value = page.getByTestId('settings-value');
    const before = await value.inputValue();

    await value.fill('45');
    await page.getByTestId('settings-save').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await page.reload();
    await expect(page.getByTestId('settings-value')).toHaveValue(before);

    await page.getByTestId('settings-value').fill('45');
    await page.getByTestId('settings-save').click();
    await dialog.locator('input[type="password"]').fill(superadmin.password);
    await dialog.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText('Identity confirmed. Save again to apply the change.')).toBeVisible();
    await page.getByTestId('settings-save').click();
    await expect(page.getByText('Setting saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('settings-value')).toHaveValue('45');
});
