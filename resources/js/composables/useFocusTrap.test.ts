import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import { useFocusTrap } from './useFocusTrap';

const Host = defineComponent({
    props: { open: { type: Boolean, required: true } },
    setup(props) {
        const panel = ref<HTMLElement | null>(null);
        useFocusTrap(panel, () => props.open, { onEscape: () => undefined });
        return () =>
            props.open ? h('div', { ref: panel }, [h('button', { 'data-testid': 'inside' }, 'Inside')]) : null;
    },
});

const ThreeButtons = defineComponent({
    props: { open: { type: Boolean, required: true } },
    setup(props) {
        const panel = ref<HTMLElement | null>(null);
        useFocusTrap(panel, () => props.open, { onEscape: () => undefined });
        return () =>
            props.open
                ? h('div', { ref: panel }, [h('button', 'One'), h('button', 'Two'), h('button', 'Three')])
                : null;
    },
});

describe('useFocusTrap', () => {
    it('refocuses nothing when the element that had focus is not an HTML element', async () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('tabindex', '0');
        document.body.appendChild(svg);
        svg.focus();
        expect(document.activeElement).toBe(svg);

        const wrapper = mount(Host, { props: { open: false }, attachTo: document.body });
        await wrapper.setProps({ open: true });
        await nextTick();
        expect(document.activeElement).toBe(wrapper.get('[data-testid="inside"]').element);

        await wrapper.setProps({ open: false });
        await nextTick();

        expect(document.activeElement).not.toBe(svg);

        wrapper.unmount();
        svg.remove();
    });

    it('wraps Tab only at the edges and ignores other keys', async () => {
        const wrapper = mount(ThreeButtons, { props: { open: true }, attachTo: document.body });
        await nextTick();

        const [first, middle, last] = wrapper.findAll('button').map((button) => button.element as HTMLElement);
        if (!first || !middle || !last) throw new Error('buttons missing');

        middle.focus();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
        expect(document.activeElement).toBe(middle);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', cancelable: true }));
        expect(document.activeElement).toBe(middle);

        last.focus();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
        expect(document.activeElement).toBe(first);

        wrapper.unmount();
    });
});
