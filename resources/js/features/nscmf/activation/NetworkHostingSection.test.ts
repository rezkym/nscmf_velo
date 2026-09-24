import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import NetworkHostingSection, { type NetworkFields } from './NetworkHostingSection.vue';

function mountSection(modelValue: NetworkFields = {}, props: Record<string, unknown> = {}): VueWrapper {
    return mount(NetworkHostingSection, { props: { modelValue, ...props } });
}

function lastModel(wrapper: VueWrapper): NetworkFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as NetworkFields;
}

function isRequired(wrapper: VueWrapper, id: string): boolean {
    return wrapper.get(`label[for="${id}"]`).find('[data-required]').exists();
}

describe('NetworkHostingSection (FE-22)', () => {
    it('AC1: keeps IPv4, IPv6, CIDR and range input exactly as written', async () => {
        const wrapper = mountSection();

        await wrapper.get('#lan_ip_allocation').setValue('192.0.2.0/24\n10.10.1.10-10.10.1.20');
        expect(lastModel(wrapper).lan_ip_allocation).toBe('192.0.2.0/24\n10.10.1.10-10.10.1.20');

        await wrapper.get('#wan_ip').setValue('2001:db8::1/64');
        expect(lastModel(wrapper).wan_ip).toBe('2001:db8::1/64');

        await wrapper.get('#gateway').setValue('2001:db8::1');
        expect(lastModel(wrapper).gateway).toBe('2001:db8::1');
    });

    it('AC3: keeps POP, regional, upstream and router identifiers as free text of 255 characters', () => {
        const wrapper = mountSection();

        for (const id of [
            'pop',
            'regional',
            'preferred_upstream',
            'secondary_upstream',
            'primary_noc_link',
            'secondary_noc_link',
            'downlink_router',
        ]) {
            expect(wrapper.get(`#${id}`).attributes('maxlength')).toBe('255');
        }
        expect(wrapper.findAll('select')).toHaveLength(0);
    });

    it('AC4: limits the domain fields and clears a blank value to null', async () => {
        const wrapper = mountSection({ domain_name_1: 'example.com' });

        expect(wrapper.get('#domain_name_1').attributes('maxlength')).toBe('253');
        expect(wrapper.get('#domain_name_2').attributes('maxlength')).toBe('253');
        expect(wrapper.get('#hosting_platform').attributes('maxlength')).toBe('255');

        await wrapper.get('#domain_name_1').setValue('   ');
        expect(lastModel(wrapper).domain_name_1).toBeNull();
    });

    it('AC2: marks the dependent fields required once a migration is selected', async () => {
        const wrapper = mountSection();
        expect(isRequired(wrapper, 'domain_name_1')).toBe(false);
        expect(isRequired(wrapper, 'hosting_platform')).toBe(false);
        expect(isRequired(wrapper, 'hosting_capacity_gb')).toBe(false);

        await wrapper.get('[data-testid="migrate_domain"]').trigger('click');
        expect(lastModel(wrapper).migrate_domain).toBe(true);
        expect(isRequired(wrapper, 'domain_name_1')).toBe(true);

        await wrapper.get('[data-testid="migrate_hosting"]').trigger('click');
        expect(isRequired(wrapper, 'hosting_platform')).toBe(true);
        expect(isRequired(wrapper, 'hosting_capacity_gb')).toBe(true);
    });

    it('AC2: never fills a domain or a platform on the user behalf', async () => {
        const wrapper = mountSection();

        await wrapper.get('[data-testid="migrate_hosting"]').trigger('click');

        expect(lastModel(wrapper)).toEqual({ migrate_hosting: true });
    });

    it('AC2: keeps an incomplete draft editable and keeps a hosting capacity of zero', async () => {
        const wrapper = mountSection({ migrate_hosting: true });

        await wrapper.get('#hosting_capacity_gb').setValue('0');

        expect(lastModel(wrapper)).toEqual({ migrate_hosting: true, hosting_capacity_gb: 0 });
        expect(wrapper.get('#hosting_capacity_gb').attributes('disabled')).toBeUndefined();
    });

    it('AC4: shows the DNS and MX messages from the server under their own fields', () => {
        const wrapper = mountSection(
            { primary_dns: 'not-an-ip', mx_primary: 'not-a-host' },
            {
                errors: {
                    'activation.primary_dns': 'Enter a valid IP address.',
                    'activation.mx_primary': 'Enter a valid host name.',
                },
            },
        );

        expect(wrapper.get('#primary_dns-error').text()).toContain('Enter a valid IP address.');
        expect(wrapper.get('#mx_primary-error').text()).toContain('Enter a valid host name.');
    });

    it('round-trips every field it owns', () => {
        const wrapper = mountSection({
            lan_ip_allocation: '10.10.0.0/24',
            wan_ip: '203.0.113.8/30',
            gateway: '203.0.113.9',
            pop: 'Demo POP',
            regional: 'Demo Region',
            preferred_upstream: 'Demo Upstream',
            secondary_upstream: null,
            primary_noc_link: 'Demo Link',
            secondary_noc_link: null,
            downlink_router: 'Demo Router',
            domain_name_1: 'example.com',
            domain_name_2: null,
            primary_dns: '192.0.2.53',
            secondary_dns: null,
            mx_primary: '10 mail.example.com',
            mx_secondary: null,
            hosting_platform: 'Demo Hosting',
            hosting_capacity_gb: 50,
            migrate_domain: true,
            migrate_hosting: false,
        });

        expect(wrapper.get<HTMLTextAreaElement>('#lan_ip_allocation').element.value).toBe('10.10.0.0/24');
        expect(wrapper.get<HTMLInputElement>('#mx_primary').element.value).toBe('10 mail.example.com');
        expect(wrapper.get<HTMLInputElement>('#hosting_capacity_gb').element.value).toBe('50');
        expect(wrapper.get('[data-testid="migrate_domain"]').attributes('aria-checked')).toBe('true');
        expect(wrapper.get('[data-testid="migrate_hosting"]').attributes('aria-checked')).toBe('false');
        expect(wrapper.get<HTMLInputElement>('#secondary_upstream').element.value).toBe('');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection({}, { disabled: true });

        expect(wrapper.findAll('input:not([disabled]), textarea:not([disabled])')).toHaveLength(0);
    });

    it('writes every text field into its own key', async () => {
        const keys = [
            'lan_ip_allocation',
            'wan_ip',
            'gateway',
            'pop',
            'regional',
            'preferred_upstream',
            'secondary_upstream',
            'primary_noc_link',
            'secondary_noc_link',
            'downlink_router',
            'domain_name_1',
            'domain_name_2',
            'primary_dns',
            'secondary_dns',
            'mx_primary',
            'mx_secondary',
            'hosting_platform',
        ];

        for (const key of keys) {
            const wrapper = mountSection();
            await wrapper.get(`#${key}`).setValue('Demo value');
            expect(lastModel(wrapper)).toEqual({ [key]: 'Demo value' });
        }
    });

    it('writes the hosting capacity and both migration flags', async () => {
        const capacity = mountSection();
        await capacity.get('#hosting_capacity_gb').setValue('50');
        expect(lastModel(capacity)).toEqual({ hosting_capacity_gb: 50 });

        const domain = mountSection({ migrate_domain: true });
        await domain.get('[data-testid="migrate_domain"]').trigger('click');
        expect(lastModel(domain)).toEqual({ migrate_domain: false });
    });

    it('shows a server message for an identifier and for a hosting field', () => {
        const wrapper = mountSection(
            {},
            {
                errors: {
                    'activation.pop': 'This POP name is too long.',
                    'activation.hosting_capacity_gb': 'Capacity must be greater than zero.',
                },
            },
        );

        expect(wrapper.get('#pop-error').text()).toContain('This POP name is too long.');
        expect(wrapper.get('#hosting_capacity_gb-error').text()).toContain('Capacity must be greater than zero.');
    });
});
