import { expect, test } from '@playwright/test';

import { createChangeDraft } from './support/nscmf';
import { createBrowserUser } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * G25 against the real server: My Applications lists only the actor's own records, History
 * selects a whole page at once, and the administration tables search, page and open their row
 * actions from one menu (07 §34, §34.1, §48, §57.1).
 */

test('FE-67: My Applications lists only my own records and finds one by its Request No', async ({ page }) => {
    const other = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, other.username, other.password);
    const foreign = await createChangeDraft(page);
    await page.context().clearCookies();

    const owner = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, owner.username, owner.password);
    const first = await createChangeDraft(page);
    const second = await createChangeDraft(page);

    await page.getByRole('link', { name: 'My Applications' }).click();
    await expect(page).toHaveURL(/\/my-applications$/);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.locator(`a[href="${first}"]`)).toBeVisible();
    await expect(page.locator(`a[href="${second}"]`)).toBeVisible();
    await expect(page.locator(`a[href="${foreign}"]`)).toHaveCount(0);
    await expect(page.getByTestId('table-range')).toHaveText('1–2 of 2');

    const requestNo = await page.locator(`a[href="${first}"]`).innerText();
    await page.getByTestId('table-search-input').fill(requestNo);
    await expect(rows).toHaveCount(1);
    await expect(page.locator(`a[href="${first}"]`)).toBeVisible();

    await page.getByTestId('table-search-input').fill('');
    await page.getByTestId('filter-status').selectOption('PENDING_REVIEW');
    await expect(page.getByTestId('table-empty-state')).toBeVisible();

    // On a phone the Request No and its status come first (07 §57); nothing needs a sideways scroll.
    await page.getByTestId('filter-status').selectOption('');
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(rows.first().getByText('Draft', { exact: true })).toBeInViewport({ ratio: 1 });
});

test('FE-64: the History header checkbox selects and clears every row on the page', async ({ page }) => {
    const exporter = createBrowserUser({
        roles: ['Requester'],
        permissions: ['nscmf.view.history', 'nscmf.export.bulk'],
        team: true,
    });
    await loginToDashboard(page, exporter.username, exporter.password);
    await createChangeDraft(page);
    await createChangeDraft(page);

    await page.goto('/history');
    const rowBoxes = page.locator('tbody [role="checkbox"]');
    await expect(rowBoxes.first()).toBeVisible();
    const count = await rowBoxes.count();
    expect(count).toBeGreaterThan(1);

    await page.getByTestId('select-all').click();
    await expect(page.getByTestId('bulk-export')).toContainText(`${count} selected`);
    await expect(page.getByTestId('select-all')).toHaveAttribute('data-state', 'checked');

    await rowBoxes.first().click();
    await expect(page.getByTestId('select-all')).toHaveAttribute('data-state', 'indeterminate');

    await page.getByTestId('select-all').click();
    await page.getByTestId('select-all').click();
    await expect(page.getByTestId('bulk-export')).toContainText('0 selected');
});

test('FE-65: an admin searches users and opens a row action from its menu', async ({ page }) => {
    const target = createBrowserUser({ roles: ['Requester'], team: true });
    const admin = createBrowserUser({ roles: ['Superadmin'], team: true });
    await loginToDashboard(page, admin.username, admin.password);

    await page.goto('/administration/users');
    await page.getByTestId('table-search-input').fill(target.username);
    const row = page.locator('tbody tr');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(target.username);

    const menu = row.getByRole('button', { name: /^Actions for / });
    await menu.click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Edit user' })).toBeVisible();
    await expect(dialog.locator('#profile-name')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();

    await page.goto('/administration/teams');
    await expect(page.getByTestId('table-per-page-select')).toBeVisible();
    await page.getByTestId('table-per-page-select').selectOption('10');
    await expect(page).toHaveURL(/per_page=10/);
});

test('FE-66: an audit stream is one table with its filters and paging in the same card', async ({ page }) => {
    const auditor = createBrowserUser({ permissions: ['audit.security.view'], team: true });
    await loginToDashboard(page, auditor.username, auditor.password);

    await page.goto('/administration/audits/security');
    const card = page.locator('[data-testid="table-controls"]').locator('..');
    await expect(card.getByTestId('audit-filter-event')).toBeVisible();
    await expect(card.locator('thead th')).toHaveText([
        'Time',
        'Event',
        'Actor',
        'Outcome',
        'Target user',
        'Username entered',
        'IP address',
    ]);
    await expect(card.getByTestId('table-range')).toBeVisible();
    await expect(page.getByTestId('table-search-input')).toHaveCount(0);

    await card.getByTestId('audit-filter-event').selectOption('LOGIN_SUCCEEDED');
    await expect(page).toHaveURL(/event_type=LOGIN_SUCCEEDED/);
    await expect(card.locator('tbody tr').first()).toContainText('Login succeeded');
});
