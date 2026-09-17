<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ActivationDraftFields, DirectSiteBlock, PopSiteBlock } from '../draftPayload';
import FormField from '@/components/ui/FormField.vue';

export interface SiteSectionProps {
    modelValue?: ActivationDraftFields;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<SiteSectionProps>(), {
    modelValue: () => ({}),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: ActivationDraftFields): void;
    (e: 'submit-valid', value: ActivationDraftFields): void;
    (e: 'submit-invalid', errors: Record<string, string>): void;
}>();

// Track presence/cleared state
// 'unmodified' = omitted in modelValue, user has not interacted
// 'cleared' = explicitly null
// 'active' = object present or being edited
type BlockState = 'unmodified' | 'cleared' | 'active';

const directSiteState = ref<BlockState>('unmodified');
const popSiteState = ref<BlockState>('unmodified');

interface DirectSiteForm {
    local_loops: string;
    lastmile: string;
    bwa: string;
    antenna_tower: string;
    direction: string;
    rssi: string;
    latency_ms: string;
    packet_loss_percent: string;
    routers: string;
    ups: string;
    stabilizer: string;
    cable: string;
}

interface PopSiteForm {
    switch_distribution: string;
    port: string;
    vlan_id: string;
    local_loops: string;
    routers: string;
    cpe_indoor: string;
    cpe_outdoor: string;
}

const directSiteForm = ref<DirectSiteForm>({
    local_loops: '',
    lastmile: '',
    bwa: '',
    antenna_tower: '',
    direction: '',
    rssi: '',
    latency_ms: '',
    packet_loss_percent: '',
    routers: '',
    ups: '',
    stabilizer: '',
    cable: '',
});

const popSiteForm = ref<PopSiteForm>({
    switch_distribution: '',
    port: '',
    vlan_id: '',
    local_loops: '',
    routers: '',
    cpe_indoor: '',
    cpe_outdoor: '',
});

const errors = ref<Record<string, string>>({});

function formatNumericField(val: number | null | undefined): string {
    if (val === null || val === undefined) {
        return '';
    }
    return String(val);
}

function syncFromProps(val: ActivationDraftFields) {
    if (Object.hasOwn(val, 'direct_site')) {
        if (val.direct_site === null) {
            directSiteState.value = 'cleared';
        } else if (val.direct_site !== undefined) {
            directSiteState.value = 'active';
            directSiteForm.value = {
                local_loops: val.direct_site.local_loops ?? '',
                lastmile: val.direct_site.lastmile ?? '',
                bwa: val.direct_site.bwa ?? '',
                antenna_tower: val.direct_site.antenna_tower ?? '',
                direction: val.direct_site.direction ?? '',
                rssi: formatNumericField(val.direct_site.rssi),
                latency_ms: formatNumericField(val.direct_site.latency_ms),
                packet_loss_percent: formatNumericField(val.direct_site.packet_loss_percent),
                routers: val.direct_site.routers ?? '',
                ups: val.direct_site.ups ?? '',
                stabilizer: val.direct_site.stabilizer ?? '',
                cable: val.direct_site.cable ?? '',
            };
        } else {
            directSiteState.value = 'unmodified';
        }
    } else {
        directSiteState.value = 'unmodified';
    }

    if (Object.hasOwn(val, 'pop_site')) {
        if (val.pop_site === null) {
            popSiteState.value = 'cleared';
        } else if (val.pop_site !== undefined) {
            popSiteState.value = 'active';
            popSiteForm.value = {
                switch_distribution: val.pop_site.switch_distribution ?? '',
                port: val.pop_site.port ?? '',
                vlan_id: formatNumericField(val.pop_site.vlan_id),
                local_loops: val.pop_site.local_loops ?? '',
                routers: val.pop_site.routers ?? '',
                cpe_indoor: val.pop_site.cpe_indoor ?? '',
                cpe_outdoor: val.pop_site.cpe_outdoor ?? '',
            };
        } else {
            popSiteState.value = 'unmodified';
        }
    } else {
        popSiteState.value = 'unmodified';
    }
}

watch(
    () => props.modelValue,
    (val) => {
        if (val) {
            syncFromProps(val);
        }
    },
    { immediate: true, deep: true },
);

function buildDirectSitePayload(): DirectSiteBlock | null | undefined {
    if (directSiteState.value === 'unmodified') {
        return undefined;
    }
    if (directSiteState.value === 'cleared') {
        return null;
    }

    const res: DirectSiteBlock = {};
    let hasAnyField = false;

    if (directSiteForm.value.local_loops.trim() !== '') {
        res.local_loops = directSiteForm.value.local_loops;
        hasAnyField = true;
    }
    if (directSiteForm.value.lastmile.trim() !== '') {
        res.lastmile = directSiteForm.value.lastmile;
        hasAnyField = true;
    }
    if (directSiteForm.value.bwa.trim() !== '') {
        res.bwa = directSiteForm.value.bwa;
        hasAnyField = true;
    }
    if (directSiteForm.value.antenna_tower.trim() !== '') {
        res.antenna_tower = directSiteForm.value.antenna_tower;
        hasAnyField = true;
    }
    if (directSiteForm.value.direction.trim() !== '') {
        res.direction = directSiteForm.value.direction;
        hasAnyField = true;
    }
    if (directSiteForm.value.rssi.trim() !== '') {
        const n = Number(directSiteForm.value.rssi.trim());
        res.rssi = isNaN(n) ? null : n;
        hasAnyField = true;
    }
    if (directSiteForm.value.latency_ms.trim() !== '') {
        const n = Number(directSiteForm.value.latency_ms.trim());
        res.latency_ms = isNaN(n) ? null : n;
        hasAnyField = true;
    }
    if (directSiteForm.value.packet_loss_percent.trim() !== '') {
        const n = Number(directSiteForm.value.packet_loss_percent.trim());
        res.packet_loss_percent = isNaN(n) ? null : n;
        hasAnyField = true;
    }
    if (directSiteForm.value.routers.trim() !== '') {
        res.routers = directSiteForm.value.routers;
        hasAnyField = true;
    }
    if (directSiteForm.value.ups.trim() !== '') {
        res.ups = directSiteForm.value.ups;
        hasAnyField = true;
    }
    if (directSiteForm.value.stabilizer.trim() !== '') {
        res.stabilizer = directSiteForm.value.stabilizer;
        hasAnyField = true;
    }
    if (directSiteForm.value.cable.trim() !== '') {
        res.cable = directSiteForm.value.cable;
        hasAnyField = true;
    }

    if (!hasAnyField) {
        return null;
    }

    return res;
}

function buildPopSitePayload(): PopSiteBlock | null | undefined {
    if (popSiteState.value === 'unmodified') {
        return undefined;
    }
    if (popSiteState.value === 'cleared') {
        return null;
    }

    const res: PopSiteBlock = {};
    let hasAnyField = false;

    if (popSiteForm.value.switch_distribution.trim() !== '') {
        res.switch_distribution = popSiteForm.value.switch_distribution;
        hasAnyField = true;
    }
    if (popSiteForm.value.port.trim() !== '') {
        res.port = popSiteForm.value.port;
        hasAnyField = true;
    }
    if (popSiteForm.value.vlan_id.trim() !== '') {
        const n = Number(popSiteForm.value.vlan_id.trim());
        res.vlan_id = isNaN(n) ? null : n;
        hasAnyField = true;
    }
    if (popSiteForm.value.local_loops.trim() !== '') {
        res.local_loops = popSiteForm.value.local_loops;
        hasAnyField = true;
    }
    if (popSiteForm.value.routers.trim() !== '') {
        res.routers = popSiteForm.value.routers;
        hasAnyField = true;
    }
    if (popSiteForm.value.cpe_indoor.trim() !== '') {
        res.cpe_indoor = popSiteForm.value.cpe_indoor;
        hasAnyField = true;
    }
    if (popSiteForm.value.cpe_outdoor.trim() !== '') {
        res.cpe_outdoor = popSiteForm.value.cpe_outdoor;
        hasAnyField = true;
    }

    if (!hasAnyField) {
        return null;
    }

    return res;
}

function getDraftPayload(): ActivationDraftFields {
    const payload: ActivationDraftFields = {
        ...props.modelValue,
    };

    const direct = buildDirectSitePayload();
    if (directSiteState.value !== 'unmodified' || direct !== undefined) {
        payload.direct_site = direct;
    }

    const pop = buildPopSitePayload();
    if (popSiteState.value !== 'unmodified' || pop !== undefined) {
        payload.pop_site = pop;
    }

    return payload;
}

function handleDirectSiteInput() {
    directSiteState.value = 'active';
    emit('update:modelValue', getDraftPayload());
}

function handlePopSiteInput() {
    popSiteState.value = 'active';
    emit('update:modelValue', getDraftPayload());
}

function clearDirectSite() {
    directSiteState.value = 'cleared';
    directSiteForm.value = {
        local_loops: '',
        lastmile: '',
        bwa: '',
        antenna_tower: '',
        direction: '',
        rssi: '',
        latency_ms: '',
        packet_loss_percent: '',
        routers: '',
        ups: '',
        stabilizer: '',
        cable: '',
    };
    emit('update:modelValue', getDraftPayload());
}

function clearPopSite() {
    popSiteState.value = 'cleared';
    popSiteForm.value = {
        switch_distribution: '',
        port: '',
        vlan_id: '',
        local_loops: '',
        routers: '',
        cpe_indoor: '',
        cpe_outdoor: '',
    };
    emit('update:modelValue', getDraftPayload());
}

function validateSubmit(): boolean {
    const errs: Record<string, string> = {};

    // Direct Site validations
    if (directSiteState.value === 'active') {
        // String fields max 255
        const stringFields: (keyof DirectSiteForm)[] = [
            'local_loops',
            'lastmile',
            'bwa',
            'antenna_tower',
            'direction',
            'routers',
            'ups',
            'stabilizer',
            'cable',
        ];

        for (const f of stringFields) {
            if (directSiteForm.value[f].length > 255) {
                const label = f.replace(/_/g, ' ');
                const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
                errs[`direct_site_${f}`] = `${capLabel} must be max 255 characters`;
            }
        }

        // RSSI: numeric if entered, no invented range
        if (directSiteForm.value.rssi.trim() !== '') {
            const val = Number(directSiteForm.value.rssi.trim());
            if (isNaN(val)) {
                errs['direct_site_rssi'] = 'RSSI must be a valid number';
            }
        }

        // Latency: >= 0 ms
        if (directSiteForm.value.latency_ms.trim() !== '') {
            const val = Number(directSiteForm.value.latency_ms.trim());
            if (isNaN(val) || val < 0) {
                errs['direct_site_latency_ms'] = 'Latency must be greater than or equal to 0 ms';
            }
        }

        // Packet Loss: 0..100 %
        if (directSiteForm.value.packet_loss_percent.trim() !== '') {
            const val = Number(directSiteForm.value.packet_loss_percent.trim());
            if (isNaN(val) || val < 0 || val > 100) {
                errs['direct_site_packet_loss_percent'] = 'Packet loss must be between 0% and 100%';
            }
        }
    }

    // POP Site validations
    if (popSiteState.value === 'active') {
        const stringFields: (keyof PopSiteForm)[] = [
            'switch_distribution',
            'port',
            'local_loops',
            'routers',
            'cpe_indoor',
            'cpe_outdoor',
        ];

        for (const f of stringFields) {
            if (popSiteForm.value[f].length > 255) {
                const label = f.replace(/_/g, ' ');
                const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
                errs[`pop_site_${f}`] = `${capLabel} must be max 255 characters`;
            }
        }

        // VLAN ID: integer 1..4094
        if (popSiteForm.value.vlan_id.trim() !== '') {
            const val = Number(popSiteForm.value.vlan_id.trim());
            if (isNaN(val) || !Number.isInteger(val) || val < 1 || val > 4094) {
                errs['pop_site_vlan_id'] = 'VLAN ID must be an integer between 1 and 4094';
            }
        }
    }

    errors.value = errs;

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
});
</script>

<template>
    <section class="site-section space-y-8" data-testid="site-section">
        <!-- Direct Site Block -->
        <div class="rounded-lg border p-6 shadow-sm space-y-6 bg-card" data-testid="direct-site-card">
            <div class="flex items-center justify-between border-b pb-3">
                <div>
                    <h3 class="text-lg font-semibold tracking-tight">Customer Site Direct</h3>
                    <p class="text-sm text-muted-foreground">
                        Technical connectivity and telemetry for direct onsite installation (Optional)
                    </p>
                </div>
                <button
                    v-if="!readonly"
                    type="button"
                    class="text-xs text-destructive hover:underline font-medium cursor-pointer"
                    data-testid="clear-direct-site-btn"
                    :disabled="disabled"
                    @click="clearDirectSite"
                >
                    Clear Direct Site
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField id="direct-site-local_loops" label="Local Loops" :error="errors.direct_site_local_loops">
                    <input
                        id="direct-site-local_loops"
                        v-model="directSiteForm.local_loops"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Local Loop #1"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-local_loops"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-lastmile" label="Lastmile" :error="errors.direct_site_lastmile">
                    <input
                        id="direct-site-lastmile"
                        v-model="directSiteForm.lastmile"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Fiber Optic 100m"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-lastmile"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-bwa" label="BWA" :error="errors.direct_site_bwa">
                    <input
                        id="direct-site-bwa"
                        v-model="directSiteForm.bwa"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Broadband Wireless Access"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-bwa"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField
                    id="direct-site-antenna_tower"
                    label="Antenna / Tower"
                    :error="errors.direct_site_antenna_tower"
                >
                    <input
                        id="direct-site-antenna_tower"
                        v-model="directSiteForm.antenna_tower"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Tower Monopole 30m"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-antenna_tower"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-direction" label="Direction" :error="errors.direct_site_direction">
                    <input
                        id="direct-site-direction"
                        v-model="directSiteForm.direction"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. 270 deg Azimuth"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-direction"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-rssi" label="RSSI" :error="errors.direct_site_rssi">
                    <div class="relative flex items-center">
                        <input
                            id="direct-site-rssi"
                            v-model="directSiteForm.rssi"
                            type="text"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. -68.5"
                            :disabled="disabled"
                            :readonly="readonly"
                            data-testid="direct-site-rssi"
                            @input="handleDirectSiteInput"
                        />
                        <span
                            class="absolute right-3 text-xs text-muted-foreground pointer-events-none"
                            data-testid="unit-rssi"
                        >
                            dBm
                        </span>
                    </div>
                </FormField>

                <FormField id="direct-site-latency_ms" label="Latency" :error="errors.direct_site_latency_ms">
                    <div class="relative flex items-center">
                        <input
                            id="direct-site-latency_ms"
                            v-model="directSiteForm.latency_ms"
                            type="text"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. 15.2"
                            :disabled="disabled"
                            :readonly="readonly"
                            data-testid="direct-site-latency_ms"
                            @input="handleDirectSiteInput"
                        />
                        <span
                            class="absolute right-3 text-xs text-muted-foreground pointer-events-none"
                            data-testid="unit-latency_ms"
                        >
                            ms
                        </span>
                    </div>
                </FormField>

                <FormField
                    id="direct-site-packet_loss_percent"
                    label="Packet Loss"
                    :error="errors.direct_site_packet_loss_percent"
                >
                    <div class="relative flex items-center">
                        <input
                            id="direct-site-packet_loss_percent"
                            v-model="directSiteForm.packet_loss_percent"
                            type="text"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="0..100"
                            :disabled="disabled"
                            :readonly="readonly"
                            data-testid="direct-site-packet_loss_percent"
                            @input="handleDirectSiteInput"
                        />
                        <span
                            class="absolute right-3 text-xs text-muted-foreground pointer-events-none"
                            data-testid="unit-packet_loss_percent"
                        >
                            %
                        </span>
                    </div>
                </FormField>

                <FormField id="direct-site-routers" label="Routers" :error="errors.direct_site_routers">
                    <input
                        id="direct-site-routers"
                        v-model="directSiteForm.routers"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Cisco ISR 4331"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-routers"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-ups" label="UPS" :error="errors.direct_site_ups">
                    <input
                        id="direct-site-ups"
                        v-model="directSiteForm.ups"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. APC Smart-UPS 3000VA"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-ups"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-stabilizer" label="Stabilizer" :error="errors.direct_site_stabilizer">
                    <input
                        id="direct-site-stabilizer"
                        v-model="directSiteForm.stabilizer"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Matsunaga 5000W"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-stabilizer"
                        @input="handleDirectSiteInput"
                    />
                </FormField>

                <FormField id="direct-site-cable" label="Cable" :error="errors.direct_site_cable">
                    <input
                        id="direct-site-cable"
                        v-model="directSiteForm.cable"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Cat6 UTP + Drop Core"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="direct-site-cable"
                        @input="handleDirectSiteInput"
                    />
                </FormField>
            </div>
        </div>

        <!-- POP Site Block -->
        <div class="rounded-lg border p-6 shadow-sm space-y-6 bg-card" data-testid="pop-site-card">
            <div class="flex items-center justify-between border-b pb-3">
                <div>
                    <h3 class="text-lg font-semibold tracking-tight">Customer Site at POP</h3>
                    <p class="text-sm text-muted-foreground">
                        POP distribution switch and local customer equipment details (Optional)
                    </p>
                </div>
                <button
                    v-if="!readonly"
                    type="button"
                    class="text-xs text-destructive hover:underline font-medium cursor-pointer"
                    data-testid="clear-pop-site-btn"
                    :disabled="disabled"
                    @click="clearPopSite"
                >
                    Clear POP Site
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                    id="pop-site-switch_distribution"
                    label="Switch Distribution"
                    :error="errors.pop_site_switch_distribution"
                >
                    <input
                        id="pop-site-switch_distribution"
                        v-model="popSiteForm.switch_distribution"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Cisco Catalyst 3850"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-switch_distribution"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-port" label="Port" :error="errors.pop_site_port">
                    <input
                        id="pop-site-port"
                        v-model="popSiteForm.port"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Te1/0/24"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-port"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-vlan_id" label="VLAN ID" :error="errors.pop_site_vlan_id">
                    <input
                        id="pop-site-vlan_id"
                        v-model="popSiteForm.vlan_id"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="1..4094"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-vlan_id"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-local_loops" label="Local Loops" :error="errors.pop_site_local_loops">
                    <input
                        id="pop-site-local_loops"
                        v-model="popSiteForm.local_loops"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Metro-E Ring 2"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-local_loops"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-routers" label="Routers" :error="errors.pop_site_routers">
                    <input
                        id="pop-site-routers"
                        v-model="popSiteForm.routers"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. MikroTik CCR1036"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-routers"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-cpe_indoor" label="CPE Indoor" :error="errors.pop_site_cpe_indoor">
                    <input
                        id="pop-site-cpe_indoor"
                        v-model="popSiteForm.cpe_indoor"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Huawei HG8245H5"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-cpe_indoor"
                        @input="handlePopSiteInput"
                    />
                </FormField>

                <FormField id="pop-site-cpe_outdoor" label="CPE Outdoor" :error="errors.pop_site_cpe_outdoor">
                    <input
                        id="pop-site-cpe_outdoor"
                        v-model="popSiteForm.cpe_outdoor"
                        type="text"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Cambium ePMP 3000"
                        maxlength="256"
                        :disabled="disabled"
                        :readonly="readonly"
                        data-testid="pop-site-cpe_outdoor"
                        @input="handlePopSiteInput"
                    />
                </FormField>
            </div>
        </div>

        <!-- Hidden validation trigger button for test runner / form submit -->
        <button type="button" class="hidden" data-testid="validate-submit-btn" @click="validateSubmit">Validate</button>
    </section>
</template>
