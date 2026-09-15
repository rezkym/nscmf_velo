import { expect, test } from '@playwright/test';

test('home page renders the application shell through Inertia', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Welcome - NSCMF');
    await expect(page.getByRole('heading', { level: 1, name: 'NSCMF' })).toBeVisible();
});
