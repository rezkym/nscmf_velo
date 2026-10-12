import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createChangeDraft, fillSubmittableChange } from './support/nscmf';
import { createBrowserUser, provisionActivityLog, runQueuedJobs } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * T82F / G26 against the real server, queue and log workbook (07 §34.2, 12 §47.2): a submitted
 * Change appears in the Activity Log with its Maintenance Purpose and Service Impact, is selected,
 * exported as XLSX with visible progress, and downloaded.
 */

const template = path.resolve(import.meta.dirname, '../../NSCMF-Log-Template.xlsx');

test.beforeEach(() => {
    test.skip(!existsSync(template), 'The private Activity Log template is not provisioned.');
    provisionActivityLog();
});

test('T82F: a selected Activity Log entry is exported with visible progress and downloaded', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await fillSubmittableChange(page);
    await page.getByTestId('submit-button').click();
    await expect(page.getByText('Pending Review')).toBeVisible();
    const id = recordPath.split('/').pop() ?? '';

    await page.getByRole('navigation', { name: 'Sidebar Menu' }).getByRole('link', { name: 'Activity Log' }).click();
    await expect(page).toHaveURL(/\/reports\/activity-log/);
    const row = page.getByTestId(`log-row-${id}`);
    await expect(row).toContainText('Replace the optical module on the core router.');
    await expect(row).toContainText('NOC15');
    await expect(row).toContainText('Maintenance');

    await page.getByTestId(`select-${id}`).click();
    await expect(page.getByTestId('selection-count')).toHaveText('1 selected');
    await page.getByTestId('open-export').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Only the 1 selected entry');
    await expect(dialog.getByTestId('site-noc15')).toHaveAttribute('data-state', 'checked');
    await expect(dialog.getByTestId('prepared-name')).toHaveValue(requester.name);
    await dialog.getByTestId('submit-export').click();

    const job = page.getByTestId('log-export-latest');
    await expect(job).toContainText('Queued');
    await expect(job).toContainText('0%');
    await expect(page.getByTestId('exports-running')).toHaveText('1');

    runQueuedJobs();
    await expect(job).toContainText('Ready', { timeout: 30_000 });
    await expect(job).toContainText('100%');
    await expect(page.getByTestId('exports-running')).toHaveCount(0);
    const download = page.waitForEvent('download');
    await job.getByRole('button', { name: 'Download' }).click();
    expect((await download).suggestedFilename()).toMatch(
        /^nscmf-activity-log-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );

    await job.getByRole('button', { name: 'View all exports' }).click();
    const panel = page.getByRole('dialog', { name: 'Exports' });
    await expect(panel).toContainText('Files are kept for 7 days.');
    await expect(panel.locator('[data-export-id]').first()).toContainText('Ready');
});
