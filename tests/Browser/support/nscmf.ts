import { expect, type Page } from '@playwright/test';

/** Shared journey steps against the real server; they only drive the UI. */

export async function createChangeDraft(page: Page): Promise<string> {
    await page.goto('/nscmf/create');
    await page.locator('#family').selectOption('CHANGE');
    await page.locator('#subtype').selectOption('MAINTENANCE');
    await page.getByRole('button', { name: 'Create draft' }).click();
    await expect(page).toHaveURL(/\/nscmf\/\d+\/edit$/);

    return new URL(page.url()).pathname.replace('/edit', '');
}

export async function fillSubmittableChange(page: Page): Promise<void> {
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

/** Opens a record the way a user finds it: the sidebar's History, then the record's row. */
export async function openFromHistory(page: Page, recordPath: string): Promise<void> {
    await page.getByRole('navigation', { name: 'Sidebar Menu' }).getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL(/\/history/);
    await page.locator(`#main-content a[href="${recordPath}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}$`));
}

/** From the Dashboard card, opens an own Draft or returned record straight in the editor. */
export async function openOwnFromDashboard(page: Page, card: 'card-drafts' | 'card-revisions', recordPath: string) {
    await page.getByRole('navigation', { name: 'Sidebar Menu' }).getByRole('link', { name: 'Dashboard' }).click();
    await page.getByTestId(card).locator(`a[href="${recordPath}/edit"]`).click();
    await expect(page).toHaveURL(new RegExp(`${recordPath}/edit$`));
}
