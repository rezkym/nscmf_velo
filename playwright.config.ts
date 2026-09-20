import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:8010';

// Required failures stay failures: no automatic retry-as-pass (16_Testing_Specification.md §83).
export default defineConfig({
    testDir: './tests/Browser',
    forbidOnly: true,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8010',
        url: `${baseURL}/up`,
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
