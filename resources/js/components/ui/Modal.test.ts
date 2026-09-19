import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import Modal from './Modal.vue';

function press(key: string, shiftKey = false): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, cancelable: true }));
}

const Host = defineComponent({
    props: { busy: Boolean },
    setup(props) {
        const open = ref(false);
        return () => [
            h('button', { id: 'opener', onClick: () => (open.value = true) }, 'Open'),
            h(
                Modal,
                { open: open.value, title: 'Edit team', busy: props.busy, onClose: () => (open.value = false) },
                {
                    default: () => h('input', { id: 'first' }),
                    footer: () => h('button', { id: 'last' }, 'Save'),
                },
            ),
        ];
    },
});

describe('Modal', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('labels the dialog with its title and moves focus into it', async () => {
        const wrapper = mount(Host, { attachTo: document.body });
        const opener = wrapper.get('#opener');
        (opener.element as HTMLElement).focus();
        await opener.trigger('click');
        await nextTick();

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.attributes('aria-modal')).toBe('true');
        expect(document.getElementById(dialog.attributes('aria-labelledby') ?? '')?.textContent).toBe('Edit team');
        expect(document.activeElement?.id).toBe('first');
    });

    it('closes on Escape and returns focus to the opener', async () => {
        const wrapper = mount(Host, { attachTo: document.body });
        const opener = wrapper.get('#opener');
        (opener.element as HTMLElement).focus();
        await opener.trigger('click');
        await nextTick();

        press('Escape');
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(document.activeElement?.id).toBe('opener');
    });

    it('keeps Tab focus inside the dialog', async () => {
        const wrapper = mount(Host, { attachTo: document.body });
        await wrapper.get('#opener').trigger('click');
        await nextTick();

        (document.getElementById('last') as HTMLElement).focus();
        press('Tab');
        expect(document.activeElement?.id).toBe('first');

        press('Tab', true);
        expect(document.activeElement?.id).toBe('last');
    });

    it('ignores Escape while busy', async () => {
        const wrapper = mount(Host, { attachTo: document.body, props: { busy: true } });
        await wrapper.get('#opener').trigger('click');
        await nextTick();

        press('Escape');
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    });
});
