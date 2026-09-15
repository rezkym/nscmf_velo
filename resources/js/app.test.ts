import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { resolvePage } from '@/lib/inertia';

interface CapturedOptions {
    title: (title: string) => string;
    resolve: unknown;
    setup: (options: { el: HTMLElement; App: unknown; props: object; plugin: { install: () => void } }) => void;
    progress: { color: string };
}

const createInertiaApp = vi.hoisted(() => vi.fn<(options: CapturedOptions) => Promise<void>>());

vi.mock('@inertiajs/vue3', () => ({ createInertiaApp }));

describe('application entry point', () => {
    let options: CapturedOptions;

    beforeAll(async () => {
        await import('./app');

        const captured = createInertiaApp.mock.calls[0]?.[0];

        if (captured === undefined) {
            throw new Error('createInertiaApp was not called');
        }

        options = captured;
    });

    it('boots Inertia exactly once with the page resolver and brand progress color', () => {
        expect(createInertiaApp).toHaveBeenCalledTimes(1);
        expect(options.resolve).toBe(resolvePage);
        expect(options.progress).toEqual({ color: '#1B2CC1' });
    });

    it('formats document titles with the application name', () => {
        expect(options.title('Dashboard')).toBe('Dashboard - NSCMF');
        expect(options.title('')).toBe('NSCMF');
    });

    it('mounts the Inertia root component with the Inertia plugin', () => {
        const el = document.createElement('div');
        const plugin = { install: vi.fn() };
        const App = defineComponent({ setup: () => () => h('p', 'inertia root') });

        options.setup({ el, App, props: {}, plugin });

        expect(plugin.install).toHaveBeenCalledTimes(1);
        expect(el.textContent).toBe('inertia root');
    });
});
