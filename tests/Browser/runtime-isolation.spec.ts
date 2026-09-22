import { expect, test } from '@playwright/test';

import { createBrowserUser, startUnsafeServer } from './support/runtime';

/*
 * BE-005 AC-01..03 — the browser journeys run against the disposable testing runtime only,
 * with synthetic per-run credentials, no retries and no credential-capturing artifacts.
 */

test('fixtures and the served application use the disposable testing database', async ({ page }) => {
    const user = createBrowserUser({ roles: ['Requester'], team: true });

    expect(user.runtime).toEqual({ environment: 'testing', database: 'nscmf_testing' });

    await page.goto('/login');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(user.name)).toBeVisible();
});

test('each fixture account gets its own random synthetic password', () => {
    const first = createBrowserUser({ roles: ['Requester'], team: true });
    const second = createBrowserUser({ roles: ['Requester'], team: true });

    expect(first.password).not.toBe(second.password);
    expect(first.password.length).toBeGreaterThanOrEqual(12);
});

test('the suite never retries and never records traces, screenshots or video', ({}, testInfo) => {
    expect(testInfo.retry).toBe(0);
    expect(testInfo.project.retries).toBe(0);
    const use = testInfo.project.use;
    expect(use.trace ?? 'off').toBe('off');
    expect(use.screenshot ?? 'off').toBe('off');
    expect(use.video ?? 'off').toBe('off');
});

test('a served process pointed at the development database refuses every request', async ({ request }) => {
    const server = startUnsafeServer(8011, { DB_DATABASE: 'nscmf' });
    try {
        let status = 0;
        for (let attempt = 0; attempt < 50 && status === 0; attempt++) {
            status = await request
                .get('http://127.0.0.1:8011/login')
                .then((response) => response.status())
                .catch(() => 0);
            if (status === 0) await new Promise((resolve) => setTimeout(resolve, 100));
        }

        expect(status).toBe(500);
    } finally {
        server.kill();
    }
});
