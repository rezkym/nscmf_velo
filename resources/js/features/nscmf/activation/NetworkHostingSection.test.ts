import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NetworkHostingSection from './NetworkHostingSection.vue';
import type { ActivationDraftFields } from '../draftPayload';

describe('FE-22: Activation NOC, DNS, domain dan hosting (NetworkHostingSection)', () => {
    const defaultData: ActivationDraftFields = {
        lan_ip_allocation: '10.10.0.0/24\n10.10.1.10-10.10.1.20',
        wan_ip: '203.0.113.8/30',
        gateway: '203.0.113.9',
        pop: 'POP Jakarta',
        regional: 'Jakarta Barat',
        preferred_upstream: 'Telkom',
        secondary_upstream: 'Indosat',
        primary_noc_link: 'Link-A',
        secondary_noc_link: 'Link-B',
        downlink_router: 'Router-01',
        domain_name_1: 'example.com',
        domain_name_2: 'sub.example.com',
        primary_dns: '8.8.8.8',
        secondary_dns: '2001:4860:4860::8888',
        mx_primary: '10 mail.example.com',
        mx_secondary: 'mail2.example.com',
        hosting_platform: 'cPanel Cloud',
        hosting_capacity_gb: 50,
        migrate_domain: false,
        migrate_hosting: false,
    };

    describe('AC1 — network_keeps_valid_examples', () => {
        it('preserves IPv4, IPv6, CIDR, and ranges in roundtrip without semantic alterations', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        lan_ip_allocation: '192.0.2.0/24, 2001:db8::1, 10.0.0.1 - 10.0.0.50\nfe80::1/64',
                        wan_ip: '2001:db8::1',
                        gateway: '2001:db8::ffff',
                    },
                },
            });

            // Initial modelValue reflected in inputs
            const lanInput = wrapper.find<HTMLTextAreaElement>('[data-testid="input-lan_ip_allocation"]');
            const wanInput = wrapper.find<HTMLInputElement>('[data-testid="input-wan_ip"]');
            const gwInput = wrapper.find<HTMLInputElement>('[data-testid="input-gateway"]');

            expect(lanInput.element.value).toBe('192.0.2.0/24, 2001:db8::1, 10.0.0.1 - 10.0.0.50\nfe80::1/64');
            expect(wanInput.element.value).toBe('2001:db8::1');
            expect(gwInput.element.value).toBe('2001:db8::ffff');

            // Inputting new IPv6 and CIDR representations
            await wanInput.setValue('2001:db8:85a3::8a2e:370:7334/64');
            await gwInput.setValue('2001:db8:85a3::1');

            expect(wrapper.emitted('update:modelValue')).toBeTruthy();
            const updateEvents = wrapper.emitted('update:modelValue')!;
            const lastRow = updateEvents[updateEvents.length - 1];
            expect(lastRow).toBeDefined();
            const lastEmitted = lastRow![0] as ActivationDraftFields;
            expect(lastEmitted.wan_ip).toBe('2001:db8:85a3::8a2e:370:7334/64');
            expect(lastEmitted.gateway).toBe('2001:db8:85a3::1');
            expect(lastEmitted.lan_ip_allocation).toBe('192.0.2.0/24, 2001:db8::1, 10.0.0.1 - 10.0.0.50\nfe80::1/64');

            // Exposed getDraftPayload() keeps them exact
            const payload = wrapper.vm.getDraftPayload();
            expect(payload.wan_ip).toBe('2001:db8:85a3::8a2e:370:7334/64');
            expect(payload.gateway).toBe('2001:db8:85a3::1');
            expect(payload.lan_ip_allocation).toBe('192.0.2.0/24, 2001:db8::1, 10.0.0.1 - 10.0.0.50\nfe80::1/64');
        });

        it('does not reject legal IPv6 address formats such as 2001:db8::1', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        wan_ip: '2001:db8::1',
                        gateway: '2001:db8::2',
                        primary_dns: '2001:4860:4860::8888',
                        secondary_dns: '2606:4700:4700::1111',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-valid')).toBeTruthy();
            expect(wrapper.find('[data-testid="error-wan_ip"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="error-gateway"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="error-primary_dns"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="error-secondary_dns"]').exists()).toBe(false);
        });
    });

    describe('AC2 — hosting_dependencies_are_action_specific', () => {
        it('requires domain_name_1 when migrate_domain is true upon submit validation', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        migrate_domain: true,
                        domain_name_1: '',
                    },
                },
            });

            // Dependency helper indicator / UI prompt
            expect(wrapper.find('[data-testid="indicator-migrate_domain-dependency"]').exists()).toBe(true);

            // In draft mode, incomplete values remain editable and exportable
            const draft = wrapper.vm.getDraftPayload();
            expect(draft.migrate_domain).toBe(true);
            expect(draft.domain_name_1).toBeNull();

            // Submit validation enforces requirement
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            expect(wrapper.find('[data-testid="error-domain_name_1"]').text()).toContain('Domain Name 1 is required when domain migration is requested');

            // Provide domain_name_1 resolves the error
            const domainInput = wrapper.find<HTMLInputElement>('[data-testid="input-domain_name_1"]');
            await domainInput.setValue('company.co.id');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-domain_name_1"]').exists()).toBe(false);
        });

        it('requires hosting_platform and positive hosting_capacity_gb when migrate_hosting is true upon submit', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        migrate_hosting: true,
                        hosting_platform: '',
                        hosting_capacity_gb: null,
                    },
                },
            });

            expect(wrapper.find('[data-testid="indicator-migrate_hosting-dependency"]').exists()).toBe(true);

            // Submit validation triggers required errors for both
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            expect(wrapper.find('[data-testid="error-hosting_platform"]').text()).toContain('Hosting platform is required when hosting migration is requested');
            expect(wrapper.find('[data-testid="error-hosting_capacity_gb"]').text()).toContain('Hosting capacity (> 0 GB) is required when hosting migration is requested');

            // Capacity <= 0 is invalid
            const capInput = wrapper.find<HTMLInputElement>('[data-testid="input-hosting_capacity_gb"]');
            const platformInput = wrapper.find<HTMLInputElement>('[data-testid="input-hosting_platform"]');

            await platformInput.setValue('cPanel');
            await capInput.setValue('0');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-hosting_capacity_gb"]').text()).toContain('Hosting capacity must be greater than 0');

            // Setting valid capacity > 0 clears error
            await capInput.setValue('25.5');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-hosting_platform"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="error-hosting_capacity_gb"]').exists()).toBe(false);
        });

        it('does not invent/pre-populate domain or platform automatically when migration checkboxes are toggled', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        domain_name_1: '',
                        hosting_platform: '',
                        migrate_domain: false,
                        migrate_hosting: false,
                    },
                },
            });

            const migDomainCheckbox = wrapper.find<HTMLInputElement>('[data-testid="checkbox-migrate_domain"]');
            const migHostingCheckbox = wrapper.find<HTMLInputElement>('[data-testid="checkbox-migrate_hosting"]');

            await migDomainCheckbox.setValue(true);
            await migHostingCheckbox.setValue(true);

            const draft = wrapper.vm.getDraftPayload();

            expect(draft.migrate_domain).toBe(true);
            expect(draft.migrate_hosting).toBe(true);
            // Must NOT invent or fabricate default domains/platforms
            expect(draft.domain_name_1).toBeNull();
            expect(draft.hosting_platform).toBeNull();
            expect(wrapper.find<HTMLInputElement>('[data-testid="input-domain_name_1"]').element.value).toBe('');
            expect(wrapper.find<HTMLInputElement>('[data-testid="input-hosting_platform"]').element.value).toBe('');
        });
    });

    describe('AC3 — network_does_not_invent_masters', () => {
        it('renders POP, regional, upstream, and downlink_router as free text inputs with maxlength 255', async () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: defaultData,
                },
            });

            const popInput = wrapper.find('[data-testid="input-pop"]');
            const regionalInput = wrapper.find('[data-testid="input-regional"]');
            const prefUpstream = wrapper.find('[data-testid="input-preferred_upstream"]');
            const secUpstream = wrapper.find('[data-testid="input-secondary_upstream"]');
            const primaryNocLink = wrapper.find('[data-testid="input-primary_noc_link"]');
            const secNocLink = wrapper.find('[data-testid="input-secondary_noc_link"]');
            const downlinkRouter = wrapper.find('[data-testid="input-downlink_router"]');

            // All must be standard text inputs, NOT select dropdowns (no invented master authorization selector)
            expect(popInput.element.tagName).toBe('INPUT');
            expect(popInput.attributes('type')).toBe('text');
            expect(popInput.attributes('maxlength')).toBe('255');

            expect(regionalInput.element.tagName).toBe('INPUT');
            expect(regionalInput.attributes('type')).toBe('text');
            expect(regionalInput.attributes('maxlength')).toBe('255');

            expect(prefUpstream.element.tagName).toBe('INPUT');
            expect(prefUpstream.attributes('maxlength')).toBe('255');

            expect(secUpstream.element.tagName).toBe('INPUT');
            expect(secUpstream.attributes('maxlength')).toBe('255');

            expect(primaryNocLink.element.tagName).toBe('INPUT');
            expect(primaryNocLink.attributes('maxlength')).toBe('255');

            expect(secNocLink.element.tagName).toBe('INPUT');
            expect(secNocLink.attributes('maxlength')).toBe('255');

            expect(downlinkRouter.element.tagName).toBe('INPUT');
            expect(downlinkRouter.attributes('maxlength')).toBe('255');

            // Allows custom free-text arbitrary network designations
            await popInput.setValue('Custom Edge PoP-99');
            await regionalInput.setValue('Region IX - Remote');
            await downlinkRouter.setValue('Cisco-ASR9000-Core-01');

            const draft = wrapper.vm.getDraftPayload();
            expect(draft.pop).toBe('Custom Edge PoP-99');
            expect(draft.regional).toBe('Region IX - Remote');
            expect(draft.downlink_router).toBe('Cisco-ASR9000-Core-01');
        });
    });

    describe('AC4 — domain_limits_and_nulls', () => {
        it('enforces boundary limits: domain max 253, hosting max 255', () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {},
                },
            });

            const d1 = wrapper.find('[data-testid="input-domain_name_1"]');
            const d2 = wrapper.find('[data-testid="input-domain_name_2"]');
            const hp = wrapper.find('[data-testid="input-hosting_platform"]');

            expect(d1.attributes('maxlength')).toBe('253');
            expect(d2.attributes('maxlength')).toBe('253');
            expect(hp.attributes('maxlength')).toBe('255');
        });

        it('explicitly normalizes blank/whitespace strings to null in draft export', () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: {
                        lan_ip_allocation: '   ',
                        wan_ip: '  ',
                        gateway: '',
                        pop: '   ',
                        regional: '',
                        preferred_upstream: ' ',
                        secondary_upstream: '',
                        primary_noc_link: '   ',
                        secondary_noc_link: '',
                        downlink_router: '',
                        domain_name_1: '   ',
                        domain_name_2: '',
                        primary_dns: '',
                        secondary_dns: '  ',
                        mx_primary: '  ',
                        mx_secondary: '',
                        hosting_platform: '  ',
                        hosting_capacity_gb: null,
                    },
                },
            });

            const draft = wrapper.vm.getDraftPayload();

            expect(draft.lan_ip_allocation).toBeNull();
            expect(draft.wan_ip).toBeNull();
            expect(draft.gateway).toBeNull();
            expect(draft.pop).toBeNull();
            expect(draft.regional).toBeNull();
            expect(draft.preferred_upstream).toBeNull();
            expect(draft.secondary_upstream).toBeNull();
            expect(draft.primary_noc_link).toBeNull();
            expect(draft.secondary_noc_link).toBeNull();
            expect(draft.downlink_router).toBeNull();
            expect(draft.domain_name_1).toBeNull();
            expect(draft.domain_name_2).toBeNull();
            expect(draft.primary_dns).toBeNull();
            expect(draft.secondary_dns).toBeNull();
            expect(draft.mx_primary).toBeNull();
            expect(draft.mx_secondary).toBeNull();
            expect(draft.hosting_platform).toBeNull();
        });

        it('displays server validation errors accurately mapped to corresponding fields via serverErrors prop', () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: defaultData,
                    serverErrors: {
                        lan_ip_allocation: 'Invalid CIDR format',
                        wan_ip: 'The wan ip field is invalid',
                        gateway: 'Gateway must be a valid IP address',
                        primary_dns: 'Primary DNS must be a valid IPv4 or IPv6 address',
                        secondary_dns: 'Secondary DNS must be a valid IPv4 or IPv6 address',
                        mx_primary: 'MX Primary must be a valid FQDN or priority + FQDN',
                        mx_secondary: 'MX Secondary must be a valid FQDN or priority + FQDN',
                        domain_name_1: 'Domain name 1 is not a valid FQDN',
                        hosting_platform: 'Hosting platform exceeds allowed length',
                    },
                },
            });

            expect(wrapper.find('[data-testid="error-lan_ip_allocation"]').text()).toBe('Invalid CIDR format');
            expect(wrapper.find('[data-testid="error-wan_ip"]').text()).toBe('The wan ip field is invalid');
            expect(wrapper.find('[data-testid="error-gateway"]').text()).toBe('Gateway must be a valid IP address');
            expect(wrapper.find('[data-testid="error-primary_dns"]').text()).toBe('Primary DNS must be a valid IPv4 or IPv6 address');
            expect(wrapper.find('[data-testid="error-secondary_dns"]').text()).toBe('Secondary DNS must be a valid IPv4 or IPv6 address');
            expect(wrapper.find('[data-testid="error-mx_primary"]').text()).toBe('MX Primary must be a valid FQDN or priority + FQDN');
            expect(wrapper.find('[data-testid="error-mx_secondary"]').text()).toBe('MX Secondary must be a valid FQDN or priority + FQDN');
            expect(wrapper.find('[data-testid="error-domain_name_1"]').text()).toBe('Domain name 1 is not a valid FQDN');
            expect(wrapper.find('[data-testid="error-hosting_platform"]').text()).toBe('Hosting platform exceeds allowed length');
        });
    });

    describe('Disabled and Readonly States', () => {
        it('disables all inputs when disabled prop is true', () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: defaultData,
                    disabled: true,
                },
            });

            const inputs = wrapper.findAll('input, textarea');
            expect(inputs.length).toBeGreaterThan(10);
            for (const input of inputs) {
                expect((input.element as HTMLInputElement).disabled).toBe(true);
            }
        });

        it('marks text inputs as readonly when readonly prop is true', () => {
            const wrapper = mount(NetworkHostingSection, {
                props: {
                    modelValue: defaultData,
                    readonly: true,
                },
            });

            const textInputs = wrapper.findAll('input[type="text"], input[type="number"], textarea');
            for (const input of textInputs) {
                expect((input.element as HTMLInputElement).readOnly).toBe(true);
            }
        });
    });
});
