import { expect, type Page, test } from '@playwright/test';

import { createChangeDraft } from './support/nscmf';
import { createBrowserUser } from './support/runtime';
import { loginToDashboard } from './support/session';

/*
 * FE-51 responsive and accessibility checks in Chromium. The viewports are samples, not a device
 * target; this is a WCAG-AA-like review aid, not a certification.
 */

const VIEWPORTS = [
    { name: 'mobile', width: 320, height: 720 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 900 },
];

async function noHorizontalScroll(page: Page): Promise<void> {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
}

/** Every visible form control has an accessible name. */
async function controlsAreLabelled(page: Page): Promise<void> {
    const unlabelled = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea')]
            .filter((control) => control.offsetParent !== null)
            .filter((control) => {
                const id = control.id;
                const byFor = id !== '' && document.querySelector(`label[for="${CSS.escape(id)}"]`) !== null;
                return (
                    !byFor &&
                    control.closest('label') === null &&
                    !control.getAttribute('aria-label') &&
                    !control.getAttribute('aria-labelledby')
                );
            })
            .map((control) => control.outerHTML.slice(0, 120)),
    );
    expect(unlabelled).toEqual([]);
}

for (const viewport of VIEWPORTS) {
    test(`AC3: key pages reflow without horizontal scrolling on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const requester = createBrowserUser({ roles: ['Requester'], team: true });

        await page.goto('/ispdfvalid');
        await noHorizontalScroll(page);
        await loginToDashboard(page, requester.username, requester.password);
        await noHorizontalScroll(page);
        const recordPath = await createChangeDraft(page);
        await noHorizontalScroll(page);
        await expect(page.getByTestId('btn-save-draft')).toBeVisible();
        await page.goto(recordPath);
        await noHorizontalScroll(page);
        await page.goto('/history');
        await noHorizontalScroll(page);
    });
}

test('AC1: a dialog is reachable by keyboard, closes on Escape and returns focus to its trigger', async ({ page }) => {
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, requester.username, requester.password);
    const recordPath = await createChangeDraft(page);
    await page.goto(recordPath);

    const trigger = page.getByTestId('lifecycle-cancel');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('textarea')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('AC2: the editor, History and the public validator label every control', async ({ page }) => {
    await page.goto('/ispdfvalid');
    await controlsAreLabelled(page);

    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, requester.username, requester.password);
    await createChangeDraft(page);
    await controlsAreLabelled(page);
    await page.goto('/history');
    await controlsAreLabelled(page);
});

test('AC5: motion is removed when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const requester = createBrowserUser({ roles: ['Requester'], team: true });
    await loginToDashboard(page, requester.username, requester.password);

    const animated = await page.evaluate(
        () =>
            [...document.querySelectorAll<HTMLElement>('*')].filter((element) => {
                const style = getComputedStyle(element);
                return parseFloat(style.transitionDuration) > 0.01 || parseFloat(style.animationDuration) > 0.01;
            }).length,
    );
    expect(animated).toBe(0);
});
