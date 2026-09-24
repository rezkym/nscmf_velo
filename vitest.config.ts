import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['resources/js/**/*.test.ts'],
        setupFiles: ['resources/js/testing/setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['resources/js/**/*.{ts,vue}'],
            exclude: ['resources/js/**/*.d.ts', 'resources/js/**/*.test.ts'],
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: 'coverage/frontend',
            thresholds: {
                lines: 80,
            },
        },
    },
});
