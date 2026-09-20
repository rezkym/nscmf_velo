import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import Alert from './Alert.vue';
import Badge from './Badge.vue';
import Button from './Button.vue';

describe('Button', () => {
    it('defaults to a non-submitting primary button and forwards attributes', async () => {
        const clicks: number[] = [];
        const wrapper = mount(Button, {
            slots: { default: 'Save' },
            attrs: { 'data-testid': 'save', onClick: () => clicks.push(1) },
        });

        expect(wrapper.attributes('type')).toBe('button');
        expect(wrapper.classes()).toContain('bg-primary');
        await wrapper.trigger('click');
        expect(clicks).toHaveLength(1);
    });

    it('renders the requested variant and type', () => {
        const wrapper = mount(Button, { props: { variant: 'destructive', type: 'submit' } });

        expect(wrapper.attributes('type')).toBe('submit');
        expect(wrapper.classes()).toContain('bg-destructive');
    });
});

describe('Badge', () => {
    it('uses neutral styling by default', () => {
        expect(mount(Badge, { slots: { default: 'Inactive' } }).classes()).toContain('bg-muted');
    });

    it('uses status styling for success and warning', () => {
        expect(mount(Badge, { props: { variant: 'success' } }).classes()).toContain('bg-emerald-50');
        expect(mount(Badge, { props: { variant: 'warning' } }).classes()).toContain('bg-amber-50');
    });
});

describe('Alert', () => {
    it('announces errors assertively and other variants politely', () => {
        expect(mount(Alert, { props: { variant: 'error' } }).attributes('role')).toBe('alert');
        expect(mount(Alert, { props: { variant: 'warning' } }).attributes('role')).toBe('status');
    });

    it('renders an optional title above the message', () => {
        const wrapper = mount(Alert, { props: { title: 'Save failed' }, slots: { default: 'Try again.' } });

        expect(wrapper.text()).toBe('Save failedTry again.');
    });
});
