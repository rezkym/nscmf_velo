import { describe, expect, it } from 'vitest';

import { resolvePage } from './inertia';

describe('resolvePage', () => {
    it('resolves an existing page component by its Inertia name', async () => {
        const welcome = await import('../Pages/Welcome.vue');

        await expect(resolvePage('Welcome')).resolves.toBe(welcome.default);
    });

    it('rejects a page name that has no component', async () => {
        await expect(resolvePage('Missing/Page')).rejects.toThrow('Inertia page not found: Missing/Page');
    });
});
