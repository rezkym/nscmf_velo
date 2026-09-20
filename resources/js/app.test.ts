import { defineComponent, type Component, type Plugin } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createInertiaApp = vi.fn();

vi.mock('@inertiajs/vue3', () => ({ createInertiaApp }));
vi.mock('../css/app.css', () => ({}));

interface EntryOptions {
    title: (title: string) => string;
    setup: (context: { el: Element; App: Component; props: Record<string, unknown>; plugin: Plugin }) => void;
}

/** Boots the entry once and returns the options it handed to Inertia. */
async function boot(): Promise<EntryOptions> {
    vi.resetModules();
    createInertiaApp.mockClear();
    await import('./app');
    const options = createInertiaApp.mock.calls[0]?.[0] as EntryOptions | undefined;
    if (!options) throw new Error('the entry did not create the Inertia app');
    return options;
}

async function bootTitle(): Promise<(title: string) => string> {
    return (await boot()).title;
}

describe('application entry', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    it('suffixes the page title with the configured application name', async () => {
        vi.stubEnv('VITE_APP_NAME', 'NSCMF Demo');

        const title = await bootTitle();

        expect(title('Dashboard')).toBe('Dashboard - NSCMF Demo');
        expect(title('')).toBe('NSCMF Demo');
    });

    it('falls back to NSCMF when no application name is configured', async () => {
        vi.stubEnv('VITE_APP_NAME', undefined);

        const title = await bootTitle();

        expect(title('Dashboard')).toBe('Dashboard - NSCMF');
    });

    it('mounts the resolved page into the element Inertia provides', async () => {
        const { setup } = await boot();
        const el = document.createElement('div');
        document.body.appendChild(el);
        const installed = vi.fn();

        setup({
            el,
            App: defineComponent({ setup: () => () => 'page body' }),
            props: {},
            plugin: { install: installed },
        });

        expect(installed).toHaveBeenCalledOnce();
        expect(el.textContent).toContain('page body');
        el.remove();
    });
});
