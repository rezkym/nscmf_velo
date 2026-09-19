<script setup lang="ts">
import { ref, watch } from 'vue';
import type {
    ActivationDraftFields,
    SlaItemRow,
    VirtualConnectionRow,
    PriorityDestinationRow,
} from '../draftPayload';

export interface BandwidthSectionProps {
    modelValue?: ActivationDraftFields;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<BandwidthSectionProps>(), {
    modelValue: () => ({}),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: ActivationDraftFields): void;
    (e: 'submit-valid', value: ActivationDraftFields): void;
    (e: 'submit-invalid', errors: Record<string, string>): void;
}>();

// Bandwidth scalar states (kept as string in inputs to avoid truncating decimals or auto-converting blank to 0)
const bandwidthInternational = ref<string>('');
const bandwidthDomesticIix = ref<string>('');
const bandwidthMixed = ref<string>('');

// Virtual connections state (max 3, rows 1..3)
interface VcState {
    row_no: number;
    value: string;
}
const virtualConnections = ref<VcState[]>([
    { row_no: 1, value: '' },
    { row_no: 2, value: '' },
    { row_no: 3, value: '' },
]);

// SLA items state (max 3, dynamic rows)
interface SlaState {
    id: number;
    text: string;
}
let nextSlaId = 1;
const slaItems = ref<SlaState[]>([]);

// Priority destinations state (max 3, dynamic rows)
interface DestState {
    id: number;
    text: string;
}
let nextDestId = 1;
const priorityDestinations = ref<DestState[]>([]);

// Error state
const errors = ref<Record<string, string>>({});

function formatDecimal(val: number | null | undefined): string {
    if (val === null || val === undefined || Number.isNaN(val)) {
        return '';
    }
    return String(val);
}

function parseOptionalPositiveNumber(str: string, fieldName: string, errorKey: string): number | null {
    const trimmed = str.trim();
    if (trimmed === '') {
        delete errors.value[errorKey];
        return null;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) {
        errors.value[errorKey] = `${fieldName} must be greater than 0 Mbps.`;
        return null;
    }
    delete errors.value[errorKey];
    return num;
}

function syncFromProps(val: ActivationDraftFields) {
    if (!val || typeof val !== 'object') {
        return;
    }

    bandwidthInternational.value = formatDecimal(val.bandwidth_international_mbps);
    bandwidthDomesticIix.value = formatDecimal(val.bandwidth_domestic_iix_mbps);
    bandwidthMixed.value = formatDecimal(val.bandwidth_mixed_mbps);

    // Sync VCs
    if (Array.isArray(val.virtual_connections)) {
        virtualConnections.value = [1, 2, 3].map((rNo) => {
            const found = val.virtual_connections?.find((vc) => vc && typeof vc === 'object' && vc.row_no === rNo);
            return {
                row_no: rNo,
                value: formatDecimal(found?.bandwidth_mbps),
            };
        });
    } else {
        virtualConnections.value = [1, 2, 3].map((rNo) => ({ row_no: rNo, value: '' }));
    }

    // Sync SLAs
    if (val?.sla_items && Array.isArray(val.sla_items) && val.sla_items.length > 0) {
        const validRows = val.sla_items.filter((item): item is SlaItemRow => Boolean(item && typeof item === 'object'));
        const sorted = [...validRows].sort((a, b) => (a.row_no ?? 0) - (b.row_no ?? 0));
        slaItems.value = sorted.slice(0, 3).map((item) => ({
            id: nextSlaId++,
            text: typeof item.requirement_text === 'string'
                ? item.requirement_text
                : item.requirement_text != null
                    ? String(item.requirement_text)
                    : '',
        }));
    } else {
        slaItems.value = [];
    }

    // Sync Priority Destinations
    if (val?.priority_destinations && Array.isArray(val.priority_destinations) && val.priority_destinations.length > 0) {
        const validRows = val.priority_destinations.filter(
            (item): item is PriorityDestinationRow => Boolean(item && typeof item === 'object'),
        );
        const sorted = [...validRows].sort((a, b) => (a.row_no ?? 0) - (b.row_no ?? 0));
        priorityDestinations.value = sorted.slice(0, 3).map((item) => ({
            id: nextDestId++,
            text: typeof item.destination === 'string'
                ? item.destination
                : item.destination != null
                    ? String(item.destination)
                    : '',
        }));
    } else {
        priorityDestinations.value = [];
    }
}

// Initial sync
syncFromProps(props.modelValue);

watch(
    () => props.modelValue,
    (newVal) => {
        syncFromProps(newVal);
    },
    { deep: true },
);

function buildPayload(): ActivationDraftFields {
    const payload: ActivationDraftFields = { ...props.modelValue };

    // International bandwidth
    if (bandwidthInternational.value.trim() === '') {
        payload.bandwidth_international_mbps = null;
    } else {
        const num = Number(bandwidthInternational.value.trim());
        payload.bandwidth_international_mbps = Number.isFinite(num) ? num : null;
    }

    // Domestic IIX bandwidth
    if (bandwidthDomesticIix.value.trim() === '') {
        payload.bandwidth_domestic_iix_mbps = null;
    } else {
        const num = Number(bandwidthDomesticIix.value.trim());
        payload.bandwidth_domestic_iix_mbps = Number.isFinite(num) ? num : null;
    }

    // Mixed bandwidth
    if (bandwidthMixed.value.trim() === '') {
        payload.bandwidth_mixed_mbps = null;
    } else {
        const num = Number(bandwidthMixed.value.trim());
        payload.bandwidth_mixed_mbps = Number.isFinite(num) ? num : null;
    }

    // Virtual Connections
    const vcRows: VirtualConnectionRow[] = [];
    for (const vc of virtualConnections.value) {
        if (vc.value.trim() !== '') {
            const num = Number(vc.value.trim());
            if (Number.isFinite(num)) {
                vcRows.push({
                    row_no: vc.row_no,
                    bandwidth_mbps: num,
                });
            }
        }
    }
    if (Object.hasOwn(props.modelValue ?? {}, 'virtual_connections') || vcRows.length > 0) {
        payload.virtual_connections = vcRows;
    } else {
        delete payload.virtual_connections;
    }

    // SLA Items: contiguous 1..N row_no, filter blank / not-started rows (R-21-1) & enforce 1000 cap (F-21-2)
    const slaRows: SlaItemRow[] = [];
    let hasOverSla = false;
    slaItems.value.forEach((item) => {
        const str = String(item.text);
        if (str.trim() !== '') {
            const codePointCount = [...str].length;
            if (codePointCount > 1000) {
                hasOverSla = true;
            }
            slaRows.push({
                row_no: slaRows.length + 1,
                requirement_text: str,
            });
        }
    });
    if (hasOverSla) {
        errors.value['sla_items'] = 'Each SLA requirement must not exceed 1,000 characters.';
    } else {
        delete errors.value['sla_items'];
    }

    if (Object.hasOwn(props.modelValue ?? {}, 'sla_items') || slaRows.length > 0) {
        payload.sla_items = slaRows;
    } else {
        delete payload.sla_items;
    }

    // Priority Destinations: contiguous 1..N row_no, filter blank / not-started rows (R-21-1) & enforce 255 cap (F-21-2)
    const destRows: PriorityDestinationRow[] = [];
    let hasOverPd = false;
    priorityDestinations.value.forEach((item) => {
        const str = String(item.text);
        if (str.trim() !== '') {
            const codePointCount = [...str].length;
            if (codePointCount > 255) {
                hasOverPd = true;
            }
            destRows.push({
                row_no: destRows.length + 1,
                destination: str,
            });
        }
    });
    if (hasOverPd) {
        errors.value['priority_destinations'] = 'Each priority destination must not exceed 255 characters.';
    } else {
        delete errors.value['priority_destinations'];
    }

    if (Object.hasOwn(props.modelValue ?? {}, 'priority_destinations') || destRows.length > 0) {
        payload.priority_destinations = destRows;
    } else {
        delete payload.priority_destinations;
    }

    return payload;
}

function handleInput() {
    // Validate values for inline errors
    parseOptionalPositiveNumber(bandwidthInternational.value, 'International Bandwidth', 'bandwidth_international');
    parseOptionalPositiveNumber(bandwidthDomesticIix.value, 'Domestic/IIX Bandwidth', 'bandwidth_domestic_iix');
    parseOptionalPositiveNumber(bandwidthMixed.value, 'Mixed Bandwidth', 'bandwidth_mixed');

    virtualConnections.value.forEach((vc) => {
        parseOptionalPositiveNumber(vc.value, `Virtual Connection #${vc.row_no}`, `vc_${vc.row_no}`);
    });

    const payload = buildPayload();
    emit('update:modelValue', payload);
}

// SLA Actions
function addSlaRow() {
    if (slaItems.value.length < 3 && !props.disabled && !props.readonly) {
        slaItems.value.push({
            id: nextSlaId++,
            text: '',
        });
        handleInput();
    }
}

function removeSlaRow(index: number) {
    if (!props.disabled && !props.readonly && index >= 0 && index < slaItems.value.length) {
        slaItems.value.splice(index, 1);
        handleInput();
    }
}

// Priority Destination Actions
function addPriorityDestRow() {
    if (priorityDestinations.value.length < 3 && !props.disabled && !props.readonly) {
        priorityDestinations.value.push({
            id: nextDestId++,
            text: '',
        });
        handleInput();
    }
}

function removePriorityDestRow(index: number) {
    if (!props.disabled && !props.readonly && index >= 0 && index < priorityDestinations.value.length) {
        priorityDestinations.value.splice(index, 1);
        handleInput();
    }
}

// Submit validation
function validateSubmit() {
    handleInput();
    const hasErrors = Object.keys(errors.value).length > 0;
    if (hasErrors) {
        emit('submit-invalid', errors.value);
    } else {
        emit('submit-valid', buildPayload());
    }
}
</script>

<template>
    <section class="space-y-6" data-testid="bandwidth-section">
        <!-- Section Header -->
        <div class="border-b pb-4">
            <h3 class="text-lg font-semibold text-foreground">Bandwidth, Specific Requirements (SLA) & Priority Destinations</h3>
            <p class="text-sm text-muted-foreground">
                Configure international, domestic, mixed bandwidth, virtual connections, business SLA specifications, and priority routing destinations.
            </p>
        </div>

        <!-- Standard Bandwidth Grid -->
        <div class="space-y-4 rounded-lg border bg-card p-4">
            <h4 class="font-medium text-foreground">Standard Bandwidth</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- International -->
                <div class="space-y-1">
                    <label for="input-bandwidth-international" class="text-sm font-medium">
                        International Bandwidth
                    </label>
                    <div class="flex items-center space-x-2">
                        <input
                            id="input-bandwidth-international"
                            v-model="bandwidthInternational"
                            type="text"
                            inputmode="decimal"
                            data-testid="input-bandwidth-international"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            :disabled="disabled"
                            :readonly="readonly"
                            placeholder="e.g. 100.125"
                            @input="handleInput"
                        />
                        <span data-testid="unit-bandwidth-international" class="text-sm text-muted-foreground font-medium">
                            Mbps
                        </span>
                    </div>
                    <p
                        v-if="errors.bandwidth_international"
                        data-testid="error-bandwidth-international"
                        class="text-xs text-destructive font-medium mt-1"
                    >
                        {{ errors.bandwidth_international }}
                    </p>
                </div>

                <!-- Domestic / IIX -->
                <div class="space-y-1">
                    <label for="input-bandwidth-domestic-iix" class="text-sm font-medium">
                        Domestic / IIX Bandwidth
                    </label>
                    <div class="flex items-center space-x-2">
                        <input
                            id="input-bandwidth-domestic-iix"
                            v-model="bandwidthDomesticIix"
                            type="text"
                            inputmode="decimal"
                            data-testid="input-bandwidth-domestic-iix"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            :disabled="disabled"
                            :readonly="readonly"
                            placeholder="e.g. 200.5"
                            @input="handleInput"
                        />
                        <span data-testid="unit-bandwidth-domestic-iix" class="text-sm text-muted-foreground font-medium">
                            Mbps
                        </span>
                    </div>
                    <p
                        v-if="errors.bandwidth_domestic_iix"
                        data-testid="error-bandwidth-domestic-iix"
                        class="text-xs text-destructive font-medium mt-1"
                    >
                        {{ errors.bandwidth_domestic_iix }}
                    </p>
                </div>

                <!-- Mixed -->
                <div class="space-y-1">
                    <label for="input-bandwidth-mixed" class="text-sm font-medium">
                        International & IIX Mixed
                    </label>
                    <div class="flex items-center space-x-2">
                        <input
                            id="input-bandwidth-mixed"
                            v-model="bandwidthMixed"
                            type="text"
                            inputmode="decimal"
                            data-testid="input-bandwidth-mixed"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            :disabled="disabled"
                            :readonly="readonly"
                            placeholder="e.g. 50"
                            @input="handleInput"
                        />
                        <span data-testid="unit-bandwidth-mixed" class="text-sm text-muted-foreground font-medium">
                            Mbps
                        </span>
                    </div>
                    <p
                        v-if="errors.bandwidth_mixed"
                        data-testid="error-bandwidth-mixed"
                        class="text-xs text-destructive font-medium mt-1"
                    >
                        {{ errors.bandwidth_mixed }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Virtual Connections (VC#1 - VC#3) -->
        <div class="space-y-4 rounded-lg border bg-card p-4">
            <h4 class="font-medium text-foreground">Virtual Connections (Custom Bandwidth)</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    v-for="vc in virtualConnections"
                    :key="vc.row_no"
                    class="space-y-1"
                >
                    <label :for="'input-vc-' + vc.row_no" class="text-sm font-medium">
                        VC #{{ vc.row_no }} Bandwidth
                    </label>
                    <div class="flex items-center space-x-2">
                        <input
                            :id="'input-vc-' + vc.row_no"
                            v-model="vc.value"
                            type="text"
                            inputmode="decimal"
                            :data-testid="'input-vc-' + vc.row_no"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            :disabled="disabled"
                            :readonly="readonly"
                            placeholder="e.g. 10.5"
                            @input="handleInput"
                        />
                        <span class="text-sm text-muted-foreground font-medium">
                            Mbps
                        </span>
                    </div>
                    <p
                        v-if="errors['vc_' + vc.row_no]"
                        :data-testid="'error-vc-' + vc.row_no"
                        class="text-xs text-destructive font-medium mt-1"
                    >
                        {{ errors['vc_' + vc.row_no] }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Specific Requirements (SLA) -->
        <div class="space-y-4 rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-medium text-foreground">Specific Requirements (SLA)</h4>
                    <p class="text-xs text-muted-foreground">Optional, maximum 3 ordered requirements (up to 1,000 characters each).</p>
                </div>
                <button
                    type="button"
                    data-testid="add-sla-row-btn"
                    class="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
                    :disabled="disabled || readonly || slaItems.length >= 3"
                    @click="addSlaRow"
                >
                    + Add SLA Row ({{ slaItems.length }}/3)
                </button>
            </div>

            <div v-if="slaItems.length === 0" class="text-sm text-muted-foreground italic py-2">
                No specific SLA requirements added yet.
            </div>

            <div v-else class="space-y-3">
                <div
                    v-for="(item, index) in slaItems"
                    :key="item.id"
                    :data-testid="'sla-row-' + (index + 1)"
                    class="flex items-start space-x-2"
                >
                    <span class="mt-2 text-xs font-semibold text-muted-foreground w-6">
                        #{{ index + 1 }}
                    </span>
                    <div class="flex-1 space-y-1">
                        <textarea
                            v-model="item.text"
                            rows="2"
                            maxlength="1000"
                            :data-testid="'input-sla-' + (index + 1)"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            :disabled="disabled"
                            :readonly="readonly"
                            placeholder="Enter SLA requirement details (max 1000 chars)..."
                            @input="handleInput"
                        ></textarea>
                    </div>
                    <button
                        type="button"
                        :data-testid="'remove-sla-row-' + (index + 1)"
                        class="mt-2 rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none"
                        :disabled="disabled || readonly"
                        aria-label="Remove SLA Row"
                        @click="removeSlaRow(index)"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <p
                v-if="errors['sla_items']"
                data-testid="error-sla-items"
                class="text-xs text-destructive mt-2"
            >
                {{ errors['sla_items'] }}
            </p>
        </div>

        <!-- Priority Destinations -->
        <div class="space-y-4 rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-medium text-foreground">Priority Destinations</h4>
                    <p class="text-xs text-muted-foreground">Optional, maximum 3 free-text destination entries (up to 255 characters each).</p>
                </div>
                <button
                    type="button"
                    data-testid="add-priority-dest-btn"
                    class="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
                    :disabled="disabled || readonly || priorityDestinations.length >= 3"
                    @click="addPriorityDestRow"
                >
                    + Add Destination ({{ priorityDestinations.length }}/3)
                </button>
            </div>

            <div v-if="priorityDestinations.length === 0" class="text-sm text-muted-foreground italic py-2">
                No priority destinations added yet.
            </div>

            <div v-else class="space-y-3">
                <div
                    v-for="(item, index) in priorityDestinations"
                    :key="item.id"
                    :data-testid="'priority-dest-row-' + (index + 1)"
                    class="flex items-center space-x-2"
                >
                    <span class="text-xs font-semibold text-muted-foreground w-6">
                        #{{ index + 1 }}
                    </span>
                    <input
                        v-model="item.text"
                        type="text"
                        maxlength="255"
                        :data-testid="'input-priority-dest-' + (index + 1)"
                        class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        placeholder="Enter destination name/endpoint (max 255 chars)..."
                        @input="handleInput"
                    />
                    <button
                        type="button"
                        :data-testid="'remove-priority-dest-' + (index + 1)"
                        class="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none"
                        :disabled="disabled || readonly"
                        aria-label="Remove Destination Row"
                        @click="removePriorityDestRow(index)"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <p
                v-if="errors['priority_destinations']"
                data-testid="error-priority-destinations"
                class="text-xs text-destructive mt-2"
            >
                {{ errors['priority_destinations'] }}
            </p>
        </div>

        <!-- Hidden / Test submit trigger -->
        <button
            type="button"
            data-testid="validate-submit-btn"
            class="hidden"
            @click="validateSubmit"
        >
            Validate Submit
        </button>
    </section>
</template>
