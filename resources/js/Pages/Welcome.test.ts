import { Head } from '@inertiajs/vue3';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import Welcome from './Welcome.vue';

// Inertia's Head needs a running Inertia app; replace it with a prop-capturing stand-in.
vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent } = await import('vue');

    return {
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: true } },
            setup: () => () => null,
        }),
    };
});

describe('Welcome page', () => {
    it('renders the application name as the page heading', () => {
        const wrapper = mount(Welcome, { props: { appName: 'NSCMF' } });

        expect(wrapper.get('h1').text()).toBe('NSCMF');
    });

    it('sets the document title through Inertia Head', () => {
        const wrapper = mount(Welcome, { props: { appName: 'NSCMF' } });

        expect(wrapper.findComponent(Head).props('title')).toBe('Welcome');
    });
});
