import { expect, type Page } from '@playwright/test';

export async function login(page: Page, username: string, password: string): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    const submitted = page.waitForResponse(
        (response) => response.url().endsWith('/login') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    await submitted;
    await page.waitForLoadState('networkidle');
}

export async function loginToDashboard(page: Page, username: string, password: string): Promise<void> {
    await login(page, username, password);
    await expect(page).toHaveURL(/\/dashboard$/);
}
