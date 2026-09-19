<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ActivationDraftFields } from '../draftPayload';

export interface NetworkHostingProps {
    modelValue?: ActivationDraftFields;
    serverErrors?: Record<string, string>;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<NetworkHostingProps>(), {
    modelValue: () => ({}),
    serverErrors: () => ({}),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: ActivationDraftFields): void;
    (e: 'submit-valid', value: ActivationDraftFields): void;
    (e: 'submit-invalid', errors: Record<string, string>): void;
}>();

// Form internal states
const lanIpAllocation = ref<string>(props.modelValue.lan_ip_allocation ?? '');
const wanIp = ref<string>(props.modelValue.wan_ip ?? '');
const gateway = ref<string>(props.modelValue.gateway ?? '');
const pop = ref<string>(props.modelValue.pop ?? '');
const regional = ref<string>(props.modelValue.regional ?? '');
const preferredUpstream = ref<string>(props.modelValue.preferred_upstream ?? '');
const secondaryUpstream = ref<string>(props.modelValue.secondary_upstream ?? '');
const primaryNocLink = ref<string>(props.modelValue.primary_noc_link ?? '');
const secondaryNocLink = ref<string>(props.modelValue.secondary_noc_link ?? '');
const downlinkRouter = ref<string>(props.modelValue.downlink_router ?? '');

const domainName1 = ref<string>(props.modelValue.domain_name_1 ?? '');
const domainName2 = ref<string>(props.modelValue.domain_name_2 ?? '');
const primaryDns = ref<string>(props.modelValue.primary_dns ?? '');
const secondaryDns = ref<string>(props.modelValue.secondary_dns ?? '');
const mxPrimary = ref<string>(props.modelValue.mx_primary ?? '');
const mxSecondary = ref<string>(props.modelValue.mx_secondary ?? '');
const hostingPlatform = ref<string>(props.modelValue.hosting_platform ?? '');
const hostingCapacityGb = ref<string | number>(
    props.modelValue.hosting_capacity_gb !== null && props.modelValue.hosting_capacity_gb !== undefined
        ? props.modelValue.hosting_capacity_gb
        : '',
);
const migrateDomain = ref<boolean>(props.modelValue.migrate_domain ?? false);
const migrateHosting = ref<boolean>(props.modelValue.migrate_hosting ?? false);

const clientErrors = ref<Record<string, string>>({});

// Dirty tracking for in-flight local edits (F-22-6)
const isDirty = ref<boolean>(false);
function markDirty() {
    isDirty.value = true;
}
function resetDirty() {
    isDirty.value = false;
}

// Merged display errors: client errors take priority on user action, otherwise serverErrors
const displayErrors = computed<Record<string, string>>(() => {
    return {
        ...props.serverErrors,
        ...clientErrors.value,
    };
});

function syncFromProps(val: ActivationDraftFields) {
    // Clear client errors when syncing from props (F-22-6)
    clientErrors.value = {};

    lanIpAllocation.value = val.lan_ip_allocation ?? '';
    wanIp.value = val.wan_ip ?? '';
    gateway.value = val.gateway ?? '';
    pop.value = val.pop ?? '';
    regional.value = val.regional ?? '';
    preferredUpstream.value = val.preferred_upstream ?? '';
    secondaryUpstream.value = val.secondary_upstream ?? '';
    primaryNocLink.value = val.primary_noc_link ?? '';
    secondaryNocLink.value = val.secondary_noc_link ?? '';
    downlinkRouter.value = val.downlink_router ?? '';

    domainName1.value = val.domain_name_1 ?? '';
    domainName2.value = val.domain_name_2 ?? '';
    primaryDns.value = val.primary_dns ?? '';
    secondaryDns.value = val.secondary_dns ?? '';
    mxPrimary.value = val.mx_primary ?? '';
    mxSecondary.value = val.mx_secondary ?? '';
    hostingPlatform.value = val.hosting_platform ?? '';
    hostingCapacityGb.value =
        val.hosting_capacity_gb !== null && val.hosting_capacity_gb !== undefined ? val.hosting_capacity_gb : '';
    migrateDomain.value = val.migrate_domain ?? false;
    migrateHosting.value = val.migrate_hosting ?? false;
}

watch(
    () => props.modelValue,
    (newVal) => {
        if (newVal) {
            // Guard against clobbering in-flight user typing (F-22-6)
            if (!isDirty.value) {
                syncFromProps(newVal);
            }
        }
    },
    { immediate: true, deep: true },
);

function toNullableString(val: string, max: number): string | null {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    return [...trimmed].slice(0, max).join('');
}

function toNullableNumber(val: string | number | null | undefined): number | null {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    const trimmed = String(val).trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function getDraftPayload(): ActivationDraftFields {
    // Explicit allowlist of fields owned by this section (F-22-1, F-22-4, F-22-5)
    // Never emit unmodelled keys from props.modelValue
    return {
        lan_ip_allocation: toNullableString(lanIpAllocation.value, 65535),
        wan_ip: toNullableString(wanIp.value, 255),
        gateway: toNullableString(gateway.value, 255),
        pop: toNullableString(pop.value, 255),
        regional: toNullableString(regional.value, 255),
        preferred_upstream: toNullableString(preferredUpstream.value, 255),
        secondary_upstream: toNullableString(secondaryUpstream.value, 255),
        primary_noc_link: toNullableString(primaryNocLink.value, 255),
        secondary_noc_link: toNullableString(secondaryNocLink.value, 255),
        downlink_router: toNullableString(downlinkRouter.value, 255),

        domain_name_1: toNullableString(domainName1.value, 253),
        domain_name_2: toNullableString(domainName2.value, 253),
        primary_dns: toNullableString(primaryDns.value, 255),
        secondary_dns: toNullableString(secondaryDns.value, 255),
        mx_primary: toNullableString(mxPrimary.value, 255),
        mx_secondary: toNullableString(mxSecondary.value, 255),
        hosting_platform: toNullableString(hostingPlatform.value, 255),
        hosting_capacity_gb: toNullableNumber(hostingCapacityGb.value),
        migrate_domain: migrateDomain.value,
        migrate_hosting: migrateHosting.value,
    };
}

function handleInput() {
    markDirty();
    clientErrors.value = {};
    emit('update:modelValue', getDraftPayload());
}

function getCharLength(val: string): number {
    return [...val].length;
}

function validateSubmit(): boolean {
    const errs: Record<string, string> = {};

    // Gate submit for readonly or disabled (F-22-2 fail closed)
    if (props.readonly || props.disabled) {
        errs['form'] = 'Form is readonly or disabled';
        clientErrors.value = errs;
        emit('submit-invalid', errs);
        return false;
    }

    // Length checks (N-22-1: reject over-length fields with visible errors)
    if (getCharLength(pop.value) > 255) {
        errs['pop'] = 'POP must be max 255 characters';
    }
    if (getCharLength(regional.value) > 255) {
        errs['regional'] = 'Regional must be max 255 characters';
    }
    if (getCharLength(preferredUpstream.value) > 255) {
        errs['preferred_upstream'] = 'Preferred upstream must be max 255 characters';
    }
    if (getCharLength(secondaryUpstream.value) > 255) {
        errs['secondary_upstream'] = 'Secondary upstream must be max 255 characters';
    }
    if (getCharLength(primaryNocLink.value) > 255) {
        errs['primary_noc_link'] = 'Primary NOC link must be max 255 characters';
    }
    if (getCharLength(secondaryNocLink.value) > 255) {
        errs['secondary_noc_link'] = 'Secondary NOC link must be max 255 characters';
    }
    if (getCharLength(downlinkRouter.value) > 255) {
        errs['downlink_router'] = 'Downlink router must be max 255 characters';
    }
    if (getCharLength(domainName1.value) > 253) {
        errs['domain_name_1'] = 'Domain name 1 must be max 253 characters';
    }
    if (getCharLength(domainName2.value) > 253) {
        errs['domain_name_2'] = 'Domain name 2 must be max 253 characters';
    }
    if (getCharLength(primaryDns.value) > 255) {
        errs['primary_dns'] = 'Primary DNS must be max 255 characters';
    }
    if (getCharLength(secondaryDns.value) > 255) {
        errs['secondary_dns'] = 'Secondary DNS must be max 255 characters';
    }
    if (getCharLength(mxPrimary.value) > 255) {
        errs['mx_primary'] = 'MX primary must be max 255 characters';
    }
    if (getCharLength(mxSecondary.value) > 255) {
        errs['mx_secondary'] = 'MX secondary must be max 255 characters';
    }
    if (getCharLength(hostingPlatform.value) > 255) {
        errs['hosting_platform'] = 'Hosting platform must be max 255 characters';
    }

    // AC2: migrate_domain dependency
    if (migrateDomain.value) {
        if (!domainName1.value || domainName1.value.trim() === '') {
            errs['domain_name_1'] = 'Domain Name 1 is required when domain migration is requested';
        }
    }

    // AC2: migrate_hosting dependency
    if (migrateHosting.value) {
        if (!hostingPlatform.value || hostingPlatform.value.trim() === '') {
            errs['hosting_platform'] = 'Hosting platform is required when hosting migration is requested';
        }

        const rawCap = String(hostingCapacityGb.value).trim();
        if (rawCap === '') {
            errs['hosting_capacity_gb'] = 'Hosting capacity (> 0 GB) is required when hosting migration is requested';
        } else {
            const capacityNum = toNullableNumber(hostingCapacityGb.value);
            if (capacityNum === null || capacityNum <= 0) {
                errs['hosting_capacity_gb'] = 'Hosting capacity must be greater than 0';
            }
        }
    }

    clientErrors.value = errs;

    if (Object.keys(errs).length === 0) {
        emit('submit-valid', getDraftPayload());
        return true;
    } else {
        emit('submit-invalid', errs);
        return false;
    }
}

defineExpose({
    getDraftPayload,
    validateSubmit,
    isDirty,
    resetDirty,
});
</script>

<template>
    <section class="network-hosting-section space-y-6" data-testid="network-hosting-section">
        <!-- Form level error alert (F-22-2 / N-22b-2) -->
        <div
            v-if="displayErrors.form"
            data-testid="error-form"
            class="p-3 text-sm rounded-md bg-destructive/15 text-destructive border border-destructive/20 font-medium"
            role="alert"
        >
            {{ displayErrors.form }}
        </div>

        <!-- NOC & IP Routing Configuration -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 class="text-base font-semibold tracking-tight border-b pb-2">NOC & IP Routing Configuration</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- LAN IP Allocation -->
                <div class="space-y-1 md:col-span-2">
                    <label for="lan_ip_allocation" class="text-sm font-medium">LAN IP Allocation</label>
                    <textarea
                        id="lan_ip_allocation"
                        v-model="lanIpAllocation"
                        rows="3"
                        data-testid="input-lan_ip_allocation"
                        placeholder="e.g. 192.0.2.0/24, 2001:db8::1, 10.0.0.1 - 10.0.0.50 (newline or comma separated)"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    ></textarea>
                    <p
                        v-if="displayErrors.lan_ip_allocation"
                        data-testid="error-lan_ip_allocation"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.lan_ip_allocation }}
                    </p>
                </div>

                <!-- WAN IP -->
                <div class="space-y-1">
                    <label for="wan_ip" class="text-sm font-medium">WAN IP</label>
                    <input
                        id="wan_ip"
                        v-model="wanIp"
                        type="text"
                        maxlength="255"
                        data-testid="input-wan_ip"
                        placeholder="IPv4/IPv6/CIDR"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.wan_ip"
                        data-testid="error-wan_ip"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.wan_ip }}
                    </p>
                </div>

                <!-- Gateway -->
                <div class="space-y-1">
                    <label for="gateway" class="text-sm font-medium">Gateway</label>
                    <input
                        id="gateway"
                        v-model="gateway"
                        type="text"
                        maxlength="255"
                        data-testid="input-gateway"
                        placeholder="Single IPv4/IPv6"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.gateway"
                        data-testid="error-gateway"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.gateway }}
                    </p>
                </div>

                <!-- POP -->
                <div class="space-y-1">
                    <label for="pop" class="text-sm font-medium">POP</label>
                    <input
                        id="pop"
                        v-model="pop"
                        type="text"
                        maxlength="255"
                        data-testid="input-pop"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.pop"
                        data-testid="error-pop"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.pop }}
                    </p>
                </div>

                <!-- Regional -->
                <div class="space-y-1">
                    <label for="regional" class="text-sm font-medium">Regional</label>
                    <input
                        id="regional"
                        v-model="regional"
                        type="text"
                        maxlength="255"
                        data-testid="input-regional"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.regional"
                        data-testid="error-regional"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.regional }}
                    </p>
                </div>

                <!-- Preferred Upstream -->
                <div class="space-y-1">
                    <label for="preferred_upstream" class="text-sm font-medium">Preferred Upstream</label>
                    <input
                        id="preferred_upstream"
                        v-model="preferredUpstream"
                        type="text"
                        maxlength="255"
                        data-testid="input-preferred_upstream"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.preferred_upstream"
                        data-testid="error-preferred_upstream"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.preferred_upstream }}
                    </p>
                </div>

                <!-- Secondary Upstream -->
                <div class="space-y-1">
                    <label for="secondary_upstream" class="text-sm font-medium">Secondary Upstream</label>
                    <input
                        id="secondary_upstream"
                        v-model="secondaryUpstream"
                        type="text"
                        maxlength="255"
                        data-testid="input-secondary_upstream"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.secondary_upstream"
                        data-testid="error-secondary_upstream"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.secondary_upstream }}
                    </p>
                </div>

                <!-- Primary NOC Link -->
                <div class="space-y-1">
                    <label for="primary_noc_link" class="text-sm font-medium">Primary NOC Link</label>
                    <input
                        id="primary_noc_link"
                        v-model="primaryNocLink"
                        type="text"
                        maxlength="255"
                        data-testid="input-primary_noc_link"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.primary_noc_link"
                        data-testid="error-primary_noc_link"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.primary_noc_link }}
                    </p>
                </div>

                <!-- Secondary NOC Link -->
                <div class="space-y-1">
                    <label for="secondary_noc_link" class="text-sm font-medium">Secondary NOC Link</label>
                    <input
                        id="secondary_noc_link"
                        v-model="secondaryNocLink"
                        type="text"
                        maxlength="255"
                        data-testid="input-secondary_noc_link"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.secondary_noc_link"
                        data-testid="error-secondary_noc_link"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.secondary_noc_link }}
                    </p>
                </div>

                <!-- Downlink Router -->
                <div class="space-y-1 md:col-span-2">
                    <label for="downlink_router" class="text-sm font-medium">Downlink Router</label>
                    <input
                        id="downlink_router"
                        v-model="downlinkRouter"
                        type="text"
                        maxlength="255"
                        data-testid="input-downlink_router"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.downlink_router"
                        data-testid="error-downlink_router"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.downlink_router }}
                    </p>
                </div>
            </div>
        </div>

        <!-- DNS, Domain & Email Configuration -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 class="text-base font-semibold tracking-tight border-b pb-2">DNS, Domain & Email Configuration</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Domain Name 1 -->
                <div class="space-y-1">
                    <label for="domain_name_1" class="text-sm font-medium">
                        Domain Name 1
                        <span v-if="migrateDomain" class="text-destructive">*</span>
                    </label>
                    <input
                        id="domain_name_1"
                        v-model="domainName1"
                        type="text"
                        maxlength="253"
                        data-testid="input-domain_name_1"
                        placeholder="example.com"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.domain_name_1"
                        data-testid="error-domain_name_1"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.domain_name_1 }}
                    </p>
                </div>

                <!-- Domain Name 2 -->
                <div class="space-y-1">
                    <label for="domain_name_2" class="text-sm font-medium">Domain Name 2</label>
                    <input
                        id="domain_name_2"
                        v-model="domainName2"
                        type="text"
                        maxlength="253"
                        data-testid="input-domain_name_2"
                        placeholder="secondary.example.com"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.domain_name_2"
                        data-testid="error-domain_name_2"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.domain_name_2 }}
                    </p>
                </div>

                <!-- Primary DNS -->
                <div class="space-y-1">
                    <label for="primary_dns" class="text-sm font-medium">Primary DNS</label>
                    <input
                        id="primary_dns"
                        v-model="primaryDns"
                        type="text"
                        maxlength="255"
                        data-testid="input-primary_dns"
                        placeholder="IPv4 or IPv6"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.primary_dns"
                        data-testid="error-primary_dns"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.primary_dns }}
                    </p>
                </div>

                <!-- Secondary DNS -->
                <div class="space-y-1">
                    <label for="secondary_dns" class="text-sm font-medium">Secondary DNS</label>
                    <input
                        id="secondary_dns"
                        v-model="secondaryDns"
                        type="text"
                        maxlength="255"
                        data-testid="input-secondary_dns"
                        placeholder="IPv4 or IPv6"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.secondary_dns"
                        data-testid="error-secondary_dns"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.secondary_dns }}
                    </p>
                </div>

                <!-- MX Primary -->
                <div class="space-y-1">
                    <label for="mx_primary" class="text-sm font-medium">MX Primary</label>
                    <input
                        id="mx_primary"
                        v-model="mxPrimary"
                        type="text"
                        maxlength="255"
                        data-testid="input-mx_primary"
                        placeholder="e.g. 10 mail.example.com"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.mx_primary"
                        data-testid="error-mx_primary"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.mx_primary }}
                    </p>
                </div>

                <!-- MX Secondary -->
                <div class="space-y-1">
                    <label for="mx_secondary" class="text-sm font-medium">MX Secondary</label>
                    <input
                        id="mx_secondary"
                        v-model="mxSecondary"
                        type="text"
                        maxlength="255"
                        data-testid="input-mx_secondary"
                        placeholder="e.g. 20 mail2.example.com"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.mx_secondary"
                        data-testid="error-mx_secondary"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.mx_secondary }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Hosting & Migration Configuration -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 class="text-base font-semibold tracking-tight border-b pb-2">Hosting & Migration Services</h3>

            <!-- Migration Checkboxes -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-start space-x-2">
                    <input
                        id="migrate_domain"
                        v-model="migrateDomain"
                        type="checkbox"
                        data-testid="checkbox-migrate_domain"
                        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                        :disabled="disabled || readonly"
                        @change="handleInput"
                    />
                    <div>
                        <label for="migrate_domain" class="text-sm font-medium cursor-pointer">
                            Request Domain Migration
                        </label>
                        <p
                            v-if="migrateDomain"
                            data-testid="indicator-migrate_domain-dependency"
                            class="text-xs text-muted-foreground mt-0.5"
                        >
                            Requires Domain Name 1 upon form submit.
                        </p>
                    </div>
                </div>

                <div class="flex items-start space-x-2">
                    <input
                        id="migrate_hosting"
                        v-model="migrateHosting"
                        type="checkbox"
                        data-testid="checkbox-migrate_hosting"
                        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                        :disabled="disabled || readonly"
                        @change="handleInput"
                    />
                    <div>
                        <label for="migrate_hosting" class="text-sm font-medium cursor-pointer">
                            Request Hosting Migration
                        </label>
                        <p
                            v-if="migrateHosting"
                            data-testid="indicator-migrate_hosting-dependency"
                            class="text-xs text-muted-foreground mt-0.5"
                        >
                            Requires Hosting Platform and positive Capacity (&gt; 0 GB) upon form submit.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Hosting Platform & Capacity -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div class="space-y-1">
                    <label for="hosting_platform" class="text-sm font-medium">
                        Hosting Platform
                        <span v-if="migrateHosting" class="text-destructive">*</span>
                    </label>
                    <input
                        id="hosting_platform"
                        v-model="hostingPlatform"
                        type="text"
                        maxlength="255"
                        data-testid="input-hosting_platform"
                        placeholder="e.g. cPanel / Cloud Hosting"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.hosting_platform"
                        data-testid="error-hosting_platform"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.hosting_platform }}
                    </p>
                </div>

                <div class="space-y-1">
                    <label for="hosting_capacity_gb" class="text-sm font-medium">
                        Hosting Capacity (GB)
                        <span v-if="migrateHosting" class="text-destructive">*</span>
                    </label>
                    <input
                        id="hosting_capacity_gb"
                        v-model="hostingCapacityGb"
                        type="number"
                        step="0.001"
                        min="0"
                        data-testid="input-hosting_capacity_gb"
                        placeholder="Positive GB numeric value"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleInput"
                    />
                    <p
                        v-if="displayErrors.hosting_capacity_gb"
                        data-testid="error-hosting_capacity_gb"
                        class="text-xs text-destructive mt-1 font-medium"
                    >
                        {{ displayErrors.hosting_capacity_gb }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Hidden submit validation button for testing/parent control -->
        <button
            type="button"
            data-testid="validate-submit-btn"
            class="hidden"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled || readonly"
            @click="validateSubmit"
        >
            Validate Submit
        </button>
    </section>
</template>
