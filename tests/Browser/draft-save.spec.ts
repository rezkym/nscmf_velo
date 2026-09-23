import { expect, test } from '@playwright/test';

import { createBrowserUser } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * BE-062 / T20 — the Draft editor against the real server: create, save over JSON, reload from the
 * database, 422 keeps the input, and a version conflict neither overwrites nor replays (12 §21, §26).
 */

test('a requester creates a Change draft, saves it and finds it again after a reload', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, user.username, user.password);

    await page.goto('/nscmf/create');
    await page.locator('#family').selectOption('CHANGE');
    await page.locator('#subtype').selectOption('MAINTENANCE');
    await page.getByRole('button', { name: 'Create draft' }).click();

    await expect(page).toHaveURL(/\/nscmf\/\d+\/edit$/);
    const requestNo = (await page.locator('.font-mono').first().innerText()).trim();
    expect(requestNo).toMatch(/^NSCMF-\d{6}-\d{5}$/);

    await page.locator('#maintenance_purpose').fill('Replace the optical module.');
    await page.locator('#rollback_scenario').fill('Restore the old module.');
    await page.getByTestId('draft-request-date').fill('2026-09-30');

    const saved = page.waitForResponse(
        (response) => response.url().includes('/draft') && response.request().method() === 'PATCH',
    );
    await page.getByTestId('btn-save-draft').click();
    const response = await saved;

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data: { record_version: number }; meta: { warnings: string[] } };
    expect(body.data.record_version).toBe(2);
    await expect(page.getByTestId('save-status-indicator')).toContainText('Saved');

    await page.reload();
    await expect(page.locator('#maintenance_purpose')).toHaveValue('Replace the optical module.');
    await expect(page.getByTestId('draft-request-date')).toHaveValue('2026-09-30');

    const url = new URL(page.url());
    await page.goto(url.pathname.replace('/edit', ''));
    await expect(page.getByText('Replace the optical module.')).toBeVisible();
});

test('a duplicate manual request number comes back as a field error with the typed values kept', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, user.username, user.password);

    for (const number of ['OPS/CHROME-1', 'OPS/CHROME-2']) {
        await page.goto('/nscmf/create');
        await page.locator('#family').selectOption('CHANGE');
        await page.getByTestId('numbering-manual').check();
        await page.locator('#request-no').fill(number);
        await page.getByRole('button', { name: 'Create draft' }).click();
        await expect(page).toHaveURL(/\/nscmf\/\d+\/edit$/);
    }

    await page.locator('#rollback_scenario').fill('Kept after the rejection');
    await page.getByTestId('draft-request-no').fill('OPS/CHROME-1');
    await page.getByTestId('btn-save-draft').click();

    await expect(page.locator('#request_no-error')).toHaveText('This request number is already used.');
    await expect(page.locator('#rollback_scenario')).toHaveValue('Kept after the rejection');
    await expect(page.getByTestId('draft-request-no')).toHaveValue('OPS/CHROME-1');
});

test('a stale version is refused without overwriting and is never replayed', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, user.username, user.password);

    await page.goto('/nscmf/create');
    await page.locator('#family').selectOption('CHANGE');
    await page.getByRole('button', { name: 'Create draft' }).click();
    await expect(page).toHaveURL(/\/nscmf\/\d+\/edit$/);
    const recordPath = new URL(page.url()).pathname.replace('/edit', '');

    // Another session of the same user saves first, so the open editor now holds version 1.
    const cookies = await page.context().cookies();
    const xsrf = cookies.find((cookie) => cookie.name === 'XSRF-TOKEN');
    const other = await page.request.patch(`${recordPath}/draft`, {
        data: { record_version: 1, change: { rollback_scenario: 'Saved by the other session' } },
        headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(xsrf?.value ?? '') },
    });
    expect(other.status()).toBe(200);

    await page.locator('#rollback_scenario').fill('My unsaved edit');
    const refused = page.waitForResponse(
        (response) => response.url().includes('/draft') && response.request().method() === 'PATCH',
    );
    await page.getByTestId('btn-save-draft').click();
    expect((await refused).status()).toBe(409);

    await expect(page.getByTestId('feedback-conflict')).toContainText('A newer version exists');
    await expect(page.locator('#rollback_scenario')).toHaveValue('My unsaved edit');

    let patches = 0;
    page.on('request', (request) => {
        if (request.method() === 'PATCH') patches += 1;
    });
    await page.waitForTimeout(3000);
    await page.getByTestId('btn-save-draft').click();
    await page.waitForTimeout(500);
    expect(patches).toBe(0);

    await page.getByTestId('feedback-refresh-btn').click();
    await expect(page.locator('#rollback_scenario')).toHaveValue('Saved by the other session');
});
