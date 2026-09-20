import type { DefineComponent } from 'vue';

type PageModule = { default: DefineComponent };

const pages = import.meta.glob<PageModule>('../Pages/**/*.vue');

export async function resolvePage(name: string): Promise<DefineComponent> {
    const load = pages[`../Pages/${name}.vue`];

    if (load === undefined) {
        throw new Error(`Inertia page not found: ${name}`);
    }

    return (await load()).default;
}
