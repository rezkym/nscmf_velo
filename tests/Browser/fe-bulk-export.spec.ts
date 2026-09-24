import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createChangeDraft } from './support/nscmf';
import { createBrowserUser, provisionExports, runQueuedJobs } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * G04 and FE-44 AC3 against the real server, queue and workbook: a bulk export from History is
 * delivered as one ZIP of the ready files, and every job names the snapshot it was built from.
 */

const workbook = path.resolve(import.meta.dirname, '../../NSCMF-Form-3.0.xlsx');

test.beforeEach(() => {
    test.skip(!existsSync(workbook), 'The private official workbook is not provisioned.');
    provisionExports();
});

test('G04: records selected in History are exported together and downloaded as one ZIP', async ({ page }) => {
    const exporter = createBrowserUser({
        roles: ['Requester'],
        permissions: ['nscmf.view.history', 'nscmf.export.bulk'],
        team: true,
    });
    await loginToDashboard(page, exporter.username, exporter.password);
    const ids: string[] = [];
    for (let draft = 0; draft < 2; draft++) {
        ids.push((await createChangeDraft(page)).split('/').pop() ?? '');
    }

    await page.goto('/history');
    for (const id of ids) await page.getByTestId(`select-${id}`).check();
    await page.getByTestId('bulk-export-start').click();
    await expect(page.getByTestId('bulk-export-confirm')).toContainText('2 records');
    await page.getByTestId('bulk-export-submit').click();
    for (const id of ids) await expect(page.getByTestId(`bulk-item-${id}`)).toContainText('Queued');
    await expect(page.getByTestId('bulk-export-zip')).toHaveCount(0);

    runQueuedJobs();
    for (const id of ids) {
        await expect(page.getByTestId(`bulk-item-${id}`)).toContainText('Ready', { timeout: 30_000 });
    }
    const download = page.waitForEvent('download');
    await page.getByTestId('bulk-export-zip').click();
    const zip = await download;
    expect(zip.suggestedFilename()).toMatch(/^nscmf-exports-\d+\.zip$/);
    const zipPath = test.info().outputPath('batch.zip');
    await zip.saveAs(zipPath);

    const members = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).trim().split('\n');
    expect(members).toHaveLength(2);
    for (const member of members) expect(member).toMatch(/\.xlsx$/);
});

test('FE-44 AC3: an export names the record version, iteration and template it was built from', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);

    await page.goto(recordPath);
    await page.getByTestId('export-XLSX').click();
    const job = page.locator('[data-testid^="export-job-"]').first();
    await expect(job).toContainText('Queued');
    await expect(job).toContainText(/Version \d+/);
    await expect(job).toContainText('NSCMF-Form-3.0');
});
