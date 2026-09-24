import { expect, test } from '@playwright/test';

import { createBrowserUser } from './support/runtime';
import { createChangeDraft, fillSubmittableChange, openFromHistory } from './support/nscmf';
import { loginToDashboard } from './support/session';

/*
 * FE-16, FE-24..FE-30 integration against the real server: a Change draft is completed and
 * submitted through the UI, appears in the Team-neutral review queue, its Result is captured while
 * in review, and the dashboard counts come from the database (BE-064..BE-066, BE-076, BE-087).
 */

test('a Change is completed, submitted, reviewed from the queue and its Result captured', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const reviewer = createBrowserUser({ roles: ['Reviewer'], team: true });

    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await fillSubmittableChange(page);

    await expect(page.getByTestId('submit-button')).toBeEnabled();
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    await expect(page.getByText('Pending Review')).toBeVisible();

    // The reviewer, in another Team, finds it in the queue and opens the record.
    await page.getByTestId('btn-logout').click();
    await loginToDashboard(page, reviewer.username, reviewer.password);
    await expect(page.getByTestId('card-reviews').getByTestId('count-value')).toHaveText('1');
    await page.goto('/review');
    const requestNo = (await page.locator('tbody tr').first().locator('td').first().innerText()).trim();
    expect(requestNo).toMatch(/^NSCMF-/);
    await page.locator('tbody tr').first().getByRole('link', { name: 'View' }).click();
    await expect(page).toHaveURL(new RegExp(`${recordPath.replace('/nscmf/', '/review/')}$`));
    await expect(page.getByText('Replace the optical module on the core router.')).toBeVisible();

    // The owner captures the Result while the record is in review.
    await page.getByTestId('btn-logout').click();
    await loginToDashboard(page, requester.username, requester.password);
    await openFromHistory(page, recordPath);
    await page.getByTestId('next-step-results').click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}/edit$`));
    await expect(page.getByTestId('results-editor')).toBeVisible();
    await page.getByTestId('btn-add-row').first().click();
    await page.locator('#results-0-result_summary').fill('Module replaced, service restored.');
    await page.locator('#results-0-performance_information').fill('Zero errors for 72 hours.');
    await page.locator('#results-0-result_status').fill('Completed and monitored');

    const saved = page.waitForResponse(
        (response) => response.url().includes('/change-results') && response.request().method() === 'PATCH',
    );
    await page.getByTestId('submit-results-btn').click();
    expect((await saved).status()).toBe(200);

    await page.reload();
    await expect(page.locator('#results-0-result_summary')).toHaveValue('Module replaced, service restored.');
    await page.goto(recordPath);
    await expect(page.getByText('Completed and monitored')).toBeVisible();
});

test('the dashboard counts come from the database and hide pools the actor may not see', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });

    await loginToDashboard(page, requester.username, requester.password);
    await createChangeDraft(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('card-drafts').getByTestId('count-value')).toHaveText('1');
    await expect(page.getByTestId('card-revisions').getByTestId('count-value')).toHaveText('0');
    await expect(page.getByTestId('card-reviews')).toHaveCount(0);
    await expect(page.getByTestId('card-approvals')).toHaveCount(0);
});

/*
 * G22 — the Dashboard analytics come from the database (12 §44.1) and the organization view follows
 * nscmf.analytics.view + nscmf.view.history (04 §12.1); the switch is never a client-side grant.
 */
test('the Dashboard shows own activity from the database and the organization view only with both permissions', async ({
    page,
}) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    const analyticsOnly = createBrowserUser({ permissions: ['nscmf.analytics.view'], team: true });
    const lead = createBrowserUser({ roles: ['Superadmin'], team: true });

    await loginToDashboard(page, requester.username, requester.password);
    await createChangeDraft(page);
    await fillSubmittableChange(page);
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('business-status-badge')).toHaveText('Pending Review');
    await page.getByRole('navigation', { name: 'Sidebar Menu' }).getByRole('link', { name: 'Dashboard' }).click();

    await expect(page.getByTestId('activity-total')).toHaveText(['1', '1', '0']);
    await expect(page.getByTestId('analytics-scope')).toHaveCount(0);
    await expect(page.getByTestId('status-panel').getByRole('listitem').nth(1)).toContainText('Pending Review');
    await expect(page.getByTestId('status-panel').getByRole('listitem').nth(1)).toContainText('1');

    await page.getByTestId('btn-logout').click();
    await loginToDashboard(page, analyticsOnly.username, analyticsOnly.password);
    await expect(page.getByTestId('activity-panel')).toBeVisible();
    await expect(page.getByTestId('analytics-scope')).toHaveCount(0);

    await page.getByTestId('btn-logout').click();
    await loginToDashboard(page, lead.username, lead.password);
    await page.getByTestId('analytics-scope').getByRole('tab', { name: 'Organization' }).click();
    const legend = page.getByTestId('activity-legend');
    await expect(legend).not.toContainText('Created');
    expect(Number(await page.getByTestId('activity-total').first().innerText())).toBeGreaterThanOrEqual(1);
});
