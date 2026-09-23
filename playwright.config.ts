import { defineConfig, devices } from '@playwright/test';

import {
    BROWSER_PORT,
    BROWSER_SERVER_CHECK_URL,
    BROWSER_BASE_URL,
    browserRuntimeEnv,
} from './tests/Browser/support/runtime';

// Required failures stay failures: no automatic retry-as-pass (16_Testing_Specification.md §83).
// Traces, screenshots and video stay off: journeys show one-time credentials and typed passwords,
// which must never land in artifacts (BE-005 AC-03).
export default defineConfig({
    testDir: './tests/Browser',
    forbidOnly: true,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    globalSetup: './tests/Browser/support/global-setup.ts',
    use: {
        baseURL: BROWSER_BASE_URL,
        trace: 'off',
        screenshot: 'off',
        video: 'off',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        // php -S (not artisan serve) so the explicit disposable-runtime environment reaches the
        // served process; the application's boot guard refuses any other database or storage.
        command: `php -S 127.0.0.1:${BROWSER_PORT} ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php`,
        cwd: 'public',
        url: BROWSER_SERVER_CHECK_URL,
        env: browserRuntimeEnv,
        reuseExistingServer: false,
        stdout: 'ignore',
        timeout: 120_000,
    },
});
