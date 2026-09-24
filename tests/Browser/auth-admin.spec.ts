import { expect, test } from '@playwright/test';

import { login, loginToDashboard } from './support/session';
import { createBrowserUser, prepareBrowserRuntime } from './support/runtime';

/*
 * BE-044 / T72 — real Chromium journeys for authentication, mandatory password change,
 * re-authentication and administration with one-time credential privacy (FE-06, FE-08..FE-15).
 * Everything runs against the guarded disposable runtime (BE-005).
 */

test('login fails generically, succeeds with real credentials and logout ends the server session', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true });

    await login(page, user.username, 'not-the-password');
    await expect(page.getByTestId('auth-error')).toHaveText('These credentials do not match our records.');
    await expect(page).toHaveURL(/\/login$/);

    await login(page, 'no.such.user', 'not-the-password');
    await expect(page.getByTestId('auth-error')).toHaveText('These credentials do not match our records.');

    await loginToDashboard(page, user.username, user.password);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByTestId('btn-logout').click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
});

test('an account with a temporary password is held on the change page until it chooses a new one', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true, mustChangePassword: true });

    await login(page, user.username, user.password);
    await expect(page).toHaveURL(/\/account\/temporary-password$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account\/temporary-password$/);

    await page.locator('#password').fill('abcde');
    await page.locator('#password_confirmation').fill('abcde');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page.getByTestId('auth-error')).toContainText('at least 6');

    await page.locator('#password').fill('simple');
    await page.locator('#password_confirmation').fill('simple');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByTestId('btn-logout').click();
    await login(page, user.username, user.password);
    await expect(page.getByTestId('auth-error')).toBeVisible();
    await loginToDashboard(page, user.username, 'simple');
});

test('the protected identity is sent to setup until an active team and a working user exist', async ({ page }) => {
    // Readiness is installation-wide, so this journey starts from a freshly reset disposable runtime.
    prepareBrowserRuntime();
    const admin = createBrowserUser({ roles: ['Superadmin'], protectedSuperadmin: true });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/administration\/setup$/);
    await expect(page.getByRole('heading', { name: 'Initial setup' })).toBeVisible();
});

test('an admin creates a Team and a user; the one-time password is revealed once, no-store, and never comes back', async ({
    page,
}) => {
    createBrowserUser({ roles: ['Requester'], team: true });
    const admin = createBrowserUser({ roles: ['Superadmin'], team: true });

    await loginToDashboard(page, admin.username, admin.password);

    await page.goto('/administration/teams');
    await page.getByTestId('create-team-btn').click();
    await page.locator('#team-name').fill('Team Chromium');
    await page
        .getByRole('dialog')
        .getByRole('button', { name: /save|create/i })
        .click();
    await expect(page.getByRole('cell', { name: 'Team Chromium' })).toBeVisible();

    await page.goto('/administration/users');
    await page.getByTestId('btn-create-user').click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#user-name').fill('Chromium Person');
    await dialog.locator('#user-username').fill('chromium.person');
    await dialog.locator('#user-team').selectOption({ label: 'Team Chromium' });
    await dialog
        .getByTestId(/create-role-option-/)
        .filter({ hasText: 'Requester' })
        .getByRole('checkbox')
        .check();
    await dialog.getByTestId('btn-submit-create-user').click();

    await page.locator('#current_password').fill('wrong-password');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByTestId('reauth-error')).toContainText('Re-authentication failed');

    const created = page.waitForResponse(
        (response) => response.url().endsWith('/administration/users') && response.request().method() === 'POST',
    );
    await page.locator('#current_password').fill(admin.password);
    await page.getByRole('button', { name: 'Confirm' }).click();
    const response = await created;

    expect(response.status()).toBe(201);
    expect(response.headers()['cache-control']).toContain('no-store');
    const secret = await page.getByTestId('temporary-password-display').innerText();
    expect(secret.length).toBeGreaterThanOrEqual(12);

    // The modal credential dialog hides the page behind it from assistive technology until dismissed.
    await page.getByTestId('btn-dismiss-credential').click();
    await expect(page.getByText(secret)).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'chromium.person' })).toBeVisible();

    await page.reload();
    await expect(page.getByText(secret)).toHaveCount(0);
    await page.goBack();
    await page.goForward();
    await expect(page.getByText(secret)).toHaveCount(0);
    expect(await page.evaluate(() => JSON.stringify(window.history.state))).not.toContain(secret);

    await page.getByTestId('btn-logout').click();
    await login(page, 'chromium.person', secret);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/account\/temporary-password$/);
});
