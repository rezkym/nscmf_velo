<script setup lang="ts">
import DraftField from '../DraftField.vue';
import DraftNumberField from '../DraftNumberField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import type { ActivationDraftFields } from '../types';

/** NOC configuration, DNS/domain/email and hosting (06 §29-31). Every field is optional for a draft. */
export type NetworkFields = Pick<
    ActivationDraftFields,
    | 'lan_ip_allocation'
    | 'wan_ip'
    | 'gateway'
    | 'pop'
    | 'regional'
    | 'preferred_upstream'
    | 'secondary_upstream'
    | 'primary_noc_link'
    | 'secondary_noc_link'
    | 'downlink_router'
    | 'domain_name_1'
    | 'domain_name_2'
    | 'primary_dns'
    | 'secondary_dns'
    | 'mx_primary'
    | 'mx_secondary'
    | 'hosting_platform'
    | 'hosting_capacity_gb'
    | 'migrate_domain'
    | 'migrate_hosting'
>;

const model = defineModel<NetworkFields>({ required: true });

const props = withDefaults(defineProps<{ errors?: FieldErrors; disabled?: boolean }>(), { errors: () => ({}) });

const TEXT_MAX = 255;
const DOMAIN_MAX = 253;

/** Identifiers with no approved master list, so they stay free text (06 §29). */
const IDENTIFIERS: { key: keyof NetworkFields; label: string }[] = [
    { key: 'pop', label: 'POP' },
    { key: 'regional', label: 'Regional' },
    { key: 'preferred_upstream', label: 'Preferred upstream' },
    { key: 'secondary_upstream', label: 'Secondary upstream' },
    { key: 'primary_noc_link', label: 'Primary link to NOC' },
    { key: 'secondary_noc_link', label: 'Secondary link to NOC' },
    { key: 'downlink_router', label: 'Downlink router' },
];

function update(patch: Partial<NetworkFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(key: keyof NetworkFields): string | undefined {
    return fieldError(props.errors, 'activation', key);
}

function text(key: keyof NetworkFields): string | null {
    const value = model.value[key];
    return typeof value === 'string' ? value : null;
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">NOC configuration</h2>

            <DraftField
                id="lan_ip_allocation"
                label="LAN IP allocation"
                help="One entry per line, or separated by commas. IPv4, IPv6, CIDR and ranges are accepted."
                :rows="3"
                :model-value="model.lan_ip_allocation ?? null"
                :error="error('lan_ip_allocation')"
                :disabled="disabled"
                @update:model-value="(value) => update({ lan_ip_allocation: value })"
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="wan_ip"
                    label="WAN IP"
                    :maxlength="TEXT_MAX"
                    :model-value="model.wan_ip ?? null"
                    :error="error('wan_ip')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ wan_ip: value })"
                />
                <DraftField
                    id="gateway"
                    label="Gateway"
                    :maxlength="TEXT_MAX"
                    :model-value="model.gateway ?? null"
                    :error="error('gateway')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ gateway: value })"
                />
                <DraftField
                    v-for="identifier in IDENTIFIERS"
                    :id="identifier.key"
                    :key="identifier.key"
                    :label="identifier.label"
                    :maxlength="TEXT_MAX"
                    :model-value="text(identifier.key)"
                    :error="error(identifier.key)"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ [identifier.key]: value })"
                />
            </div>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">Domain, DNS and email</h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="domain_name_1"
                    label="Domain name 1"
                    :maxlength="DOMAIN_MAX"
                    :required="model.migrate_domain === true"
                    :model-value="model.domain_name_1 ?? null"
                    :error="error('domain_name_1')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ domain_name_1: value })"
                />
                <DraftField
                    id="domain_name_2"
                    label="Domain name 2"
                    :maxlength="DOMAIN_MAX"
                    :model-value="model.domain_name_2 ?? null"
                    :error="error('domain_name_2')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ domain_name_2: value })"
                />
                <DraftField
                    id="primary_dns"
                    label="Primary DNS"
                    :maxlength="TEXT_MAX"
                    :model-value="model.primary_dns ?? null"
                    :error="error('primary_dns')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ primary_dns: value })"
                />
                <DraftField
                    id="secondary_dns"
                    label="Secondary DNS"
                    :maxlength="TEXT_MAX"
                    :model-value="model.secondary_dns ?? null"
                    :error="error('secondary_dns')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ secondary_dns: value })"
                />
                <DraftField
                    id="mx_primary"
                    label="MX primary"
                    help="Host name, or priority and host name."
                    :maxlength="TEXT_MAX"
                    :model-value="model.mx_primary ?? null"
                    :error="error('mx_primary')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ mx_primary: value })"
                />
                <DraftField
                    id="mx_secondary"
                    label="MX secondary"
                    :maxlength="TEXT_MAX"
                    :model-value="model.mx_secondary ?? null"
                    :error="error('mx_secondary')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ mx_secondary: value })"
                />
            </div>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">Hosting and migration</h2>

            <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        data-testid="migrate_domain"
                        :checked="model.migrate_domain === true"
                        :disabled="disabled"
                        @change="update({ migrate_domain: ($event.target as HTMLInputElement).checked })"
                    />
                    Migrate domain
                </label>
                <label class="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        data-testid="migrate_hosting"
                        :checked="model.migrate_hosting === true"
                        :disabled="disabled"
                        @change="update({ migrate_hosting: ($event.target as HTMLInputElement).checked })"
                    />
                    Migrate hosting
                </label>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="hosting_platform"
                    label="Hosting platform"
                    :maxlength="TEXT_MAX"
                    :required="model.migrate_hosting === true"
                    :model-value="model.hosting_platform ?? null"
                    :error="error('hosting_platform')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ hosting_platform: value })"
                />
                <DraftNumberField
                    id="hosting_capacity_gb"
                    label="Hosting capacity"
                    suffix="GB"
                    :required="model.migrate_hosting === true"
                    :model-value="model.hosting_capacity_gb ?? null"
                    :error="error('hosting_capacity_gb')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ hosting_capacity_gb: value })"
                />
            </div>
        </section>
    </div>
</template>
