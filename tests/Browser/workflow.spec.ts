import { expect, type Page, test } from '@playwright/test';

import { createBrowserUser } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * FE-16, FE-24..FE-30 integration against the real server: a Change draft is completed and
 * submitted through the UI, appears in the Team-neutral review queue, its Result is captured while
 * in review, and the dashboard counts come from the database (BE-064..BE-066, BE-076, BE-087).
 */

async function createChangeDraft(page: Page): Promise<string> {
    await page.goto('/nscmf/create');
    await page.locator('#family').selectOption('CHANGE');
    await page.locator('#subtype').selectOption('MAINTENANCE');
    await page.getByRole('button', { name: 'Create draft' }).click();
    await expect(page).toHaveURL(/\/nscmf\/\d+\/edit$/);

    return new URL(page.url()).pathname.replace('/edit', '');
}

async function fillSubmittableChange(page: Page): Promise<void> {
    await page.getByTestId('draft-request-date').fill(new Date().toISOString().slice(0, 10));
    await page.locator('#maintenance_purpose').fill('Replace the optical module on the core router.');
    await page.locator('[data-collection="identified_problems"] [data-testid="btn-add-row"]').click();
    await page.locator('#identified_problems-0-problem_text').fill('Error rate rising on the main uplink.');
    await page.getByTestId('impact-NOC15').check();
    await page.locator('[data-collection="improvement_items"] [data-testid="btn-add-row"]').click();
    await page.locator('#improvement_items-0-plan_text').fill('Replace the module and watch the error rate.');
    await page.locator('#improvement_items-0-target_kpi').fill('Zero errors during the monitoring period.');
    await page.locator('#target_execution_date').fill('2027-01-15');
    await page.locator('#monitoring_period_value').fill('3');
    await page.locator('#monitoring_period_unit').selectOption('DAY');
    await page.locator('#rollback_scenario').fill('Reinstall the old module and restore the saved configuration.');
    await page.locator('#announcement_timing').selectOption('ONE_WEEK_BEFORE');

    await page.getByTestId('btn-save-draft').click();
    await expect(page.getByTestId('save-status-indicator')).toContainText('Saved');
}

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
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
    await expect(page.getByText('Replace the optical module on the core router.')).toBeVisible();

    // The owner captures the Result while the record is in review.
    await page.getByTestId('btn-logout').click();
    await loginToDashboard(page, requester.username, requester.password);
    await page.goto(`${recordPath}/edit`);
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
