<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type {
    ActivationDraftFields,
    ReferenceSelection,
    ServiceBlockRow,
} from '../draftPayload';

export type ActivationSubtype = 'Activation' | 'Upgrade/Downgrade' | 'Deactivation';

export interface GeneralServiceProps {
    subtype?: ActivationSubtype;
    requestDate?: string;
    modelValue?: ActivationDraftFields;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<GeneralServiceProps>(), {
    subtype: 'Activation',
    requestDate: '',
    modelValue: () => ({}),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: ActivationDraftFields): void;
    (e: 'submit-valid', value: ActivationDraftFields): void;
    (e: 'submit-invalid', errors: Record<string, string>): void;
}>();

// Form internal states
const customerName = ref<string>(props.modelValue.customer_name ?? '');
const contactName = ref<string>(props.modelValue.contact_name ?? '');
const installationRfsDate = ref<string>(props.modelValue.installation_rfs_date ?? '');

// Reference multi-select
const ALL_REFERENCE_TYPES = ['IWO', 'VELOSHIP', 'TICKET', 'OTHER'] as const;
type ReferenceType = (typeof ALL_REFERENCE_TYPES)[number];

// Preserve state per reference type so toggling off/on or toggling others does not discard entered values
const refSelected = ref<Record<ReferenceType, boolean>>({
    IWO: false,
    VELOSHIP: false,
    TICKET: false,
    OTHER: false,
});
const refSpecifications = ref<Record<ReferenceType, string>>({
    IWO: '',
    VELOSHIP: '',
    TICKET: '',
    OTHER: '',
});

// Service blocks state
interface ServiceBlockState {
    service_id: string;
    service_status: 'ACTIVATED' | 'DEACTIVATED' | '';
    service_description: string;
    service_location: string;
}

const existingBlock = ref<ServiceBlockState>({
    service_id: '',
    service_status: '',
    service_description: '',
    service_location: '',
});

const newBlock = ref<ServiceBlockState>({
    service_id: '',
    service_status: '',
    service_description: '',
    service_location: '',
});

// Initialize state from props.modelValue
function syncFromProps(val: ActivationDraftFields) {
    customerName.value = val.customer_name ?? '';
    contactName.value = val.contact_name ?? '';
    installationRfsDate.value = val.installation_rfs_date ?? '';

    // Reset reference selections
    for (const t of ALL_REFERENCE_TYPES) {
        refSelected.value[t] = false;
        refSpecifications.value[t] = '';
    }

    if (val.references && Array.isArray(val.references)) {
        for (const refItem of val.references) {
            const refType = refItem.reference_type;
            if (refType in refSelected.value) {
                refSelected.value[refType] = true;
                refSpecifications.value[refType] = refItem.specification ?? '';
            }
        }
    }

    // Reset service blocks
    existingBlock.value = {
        service_id: '',
        service_status: '',
        service_description: '',
        service_location: '',
    };
    newBlock.value = {
        service_id: '',
        service_status: '',
        service_description: '',
        service_location: '',
    };

    if (val.service_blocks && Array.isArray(val.service_blocks)) {
        for (const sb of val.service_blocks) {
            if (sb.service_context === 'EXISTING') {
                existingBlock.value = {
                    service_id: sb.service_id ?? '',
                    service_status: sb.service_status ?? '',
                    service_description: sb.service_description ?? '',
                    service_location: sb.service_location ?? '',
                };
            } else if (sb.service_context === 'NEW') {
                newBlock.value = {
                    service_id: sb.service_id ?? '',
                    service_status: sb.service_status ?? '',
                    service_description: sb.service_description ?? '',
                    service_location: sb.service_location ?? '',
                };
            }
        }
    }
}

watch(
    () => props.modelValue,
    (newVal) => {
        if (newVal) {
            syncFromProps(newVal);
        }
    },
    { immediate: true, deep: true },
);

// Requirement matrix based on subtype
const isExistingRequired = computed(() => {
    return props.subtype === 'Upgrade/Downgrade' || props.subtype === 'Deactivation';
});

const isNewRequired = computed(() => {
    return props.subtype === 'Activation' || props.subtype === 'Upgrade/Downgrade';
});

const isRfsRequired = computed(() => {
    return props.subtype === 'Activation' || props.subtype === 'Upgrade/Downgrade';
});

// Helper to check if a block has started (any core field non-empty)
function isBlockStarted(block: ServiceBlockState): boolean {
    return (
        block.service_id.trim() !== '' ||
        block.service_status !== '' ||
        block.service_description.trim() !== '' ||
        block.service_location.trim() !== ''
    );
}

// Errors dictionary for submit validation
const errors = ref<Record<string, string>>({});

// Export draft representation compatible with draftPayload.ts
function getDraftPayload(): ActivationDraftFields {
    const references: ReferenceSelection[] = [];
    for (const t of ALL_REFERENCE_TYPES) {
        if (refSelected.value[t]) {
            references.push({
                reference_type: t,
                specification: refSpecifications.value[t].trim() !== '' ? refSpecifications.value[t] : null,
            });
        }
    }

    const service_blocks: ServiceBlockRow[] = [];

    // EXISTING block
    const existingHasContent = isBlockStarted(existingBlock.value);
    if (existingHasContent || isExistingRequired.value) {
        service_blocks.push({
            service_context: 'EXISTING',
            service_id: existingBlock.value.service_id.trim() !== '' ? existingBlock.value.service_id : null,
            service_status: existingBlock.value.service_status !== '' ? existingBlock.value.service_status : null,
            service_description: existingBlock.value.service_description.trim() !== '' ? existingBlock.value.service_description : null,
            service_location: existingBlock.value.service_location.trim() !== '' ? existingBlock.value.service_location : null,
        });
    }

    // NEW block
    const newHasContent = isBlockStarted(newBlock.value);
    if (newHasContent || isNewRequired.value) {
        service_blocks.push({
            service_context: 'NEW',
            service_id: newBlock.value.service_id.trim() !== '' ? newBlock.value.service_id : null,
            service_status: newBlock.value.service_status !== '' ? newBlock.value.service_status : null,
            service_description: newBlock.value.service_description.trim() !== '' ? newBlock.value.service_description : null,
            service_location: newBlock.value.service_location.trim() !== '' ? newBlock.value.service_location : null,
        });
    }

    // Notice: G03 forbids adding wire fields like request_date to draft payload
    return {
        ...props.modelValue,
        customer_name: customerName.value,
        contact_name: contactName.value,
        installation_rfs_date: installationRfsDate.value || null,
        references,
        service_blocks,
    };
}

function handleFieldInput() {
    emit('update:modelValue', getDraftPayload());
}

function handleReferenceToggle(t: ReferenceType, checked: boolean) {
    refSelected.value[t] = checked;
    handleFieldInput();
}

function validateSubmit(): boolean {
    const errs: Record<string, string> = {};

    // 1. Customer Name
    if (!customerName.value || customerName.value.trim() === '') {
        errs['customer_name'] = 'Customer name is required';
    } else if (customerName.value.length > 150) {
        errs['customer_name'] = 'Customer name must be max 150 characters';
    }

    // 2. Contact Name
    if (!contactName.value || contactName.value.trim() === '') {
        errs['contact_name'] = 'Contact name is required';
    } else if (contactName.value.length > 150) {
        errs['contact_name'] = 'Contact name must be max 150 characters';
    }

    // 3. Installation RFS Date
    if (isRfsRequired.value) {
        if (!installationRfsDate.value || installationRfsDate.value.trim() === '') {
            errs['installation_rfs_date'] = 'Installation date (RFS) is required';
        }
    }

    // 4. References: If OTHER is selected, specification is required and max 255. Other types optional max 255 if provided.
    for (const t of ALL_REFERENCE_TYPES) {
        if (refSelected.value[t]) {
            const spec = refSpecifications.value[t];
            if (t === 'OTHER') {
                if (!spec || spec.trim() === '') {
                    errs['ref_OTHER'] = 'Specification is required for OTHER';
                } else if (spec.length > 255) {
                    errs['ref_OTHER'] = 'Specification must be max 255 characters';
                }
            } else if (spec && spec.length > 255) {
                errs[`ref_${t}`] = 'Specification must be max 255 characters';
            }
        }
    }

    // 5. Service Blocks validation
    // Validate EXISTING block
    const existingStarted = isBlockStarted(existingBlock.value);
    if (isExistingRequired.value && !existingStarted) {
        errs['service_EXISTING'] = `EXISTING service block is required for ${props.subtype}`;
    } else if (isExistingRequired.value || existingStarted) {
        if (!existingBlock.value.service_id || existingBlock.value.service_id.trim() === '') {
            errs['service_EXISTING_service_id'] = 'Service ID is required';
        } else if (existingBlock.value.service_id.length > 100) {
            errs['service_EXISTING_service_id'] = 'Service ID must be max 100 characters';
        }

        if (!existingBlock.value.service_status) {
            errs['service_EXISTING_service_status'] = 'Service status is required';
        }

        if (!existingBlock.value.service_description || existingBlock.value.service_description.trim() === '') {
            errs['service_EXISTING_service_description'] = 'Service description is required';
        } else if (existingBlock.value.service_description.length > 2000) {
            errs['service_EXISTING_service_description'] = 'Service description must be max 2000 characters';
        }

        if (!existingBlock.value.service_location || existingBlock.value.service_location.trim() === '') {
            errs['service_EXISTING_service_location'] = 'Service location is required';
        } else if (existingBlock.value.service_location.length > 500) {
            errs['service_EXISTING_service_location'] = 'Service location must be max 500 characters';
        }
    }

    // Validate NEW block
    const newStarted = isBlockStarted(newBlock.value);
    if (isNewRequired.value && !newStarted) {
        errs['service_NEW'] = `NEW service block is required for ${props.subtype}`;
    } else if (isNewRequired.value || newStarted) {
        if (!newBlock.value.service_id || newBlock.value.service_id.trim() === '') {
            errs['service_NEW_service_id'] = 'Service ID is required';
        } else if (newBlock.value.service_id.length > 100) {
            errs['service_NEW_service_id'] = 'Service ID must be max 100 characters';
        }

        if (!newBlock.value.service_status) {
            errs['service_NEW_service_status'] = 'Service status is required';
        }

        if (!newBlock.value.service_description || newBlock.value.service_description.trim() === '') {
            errs['service_NEW_service_description'] = 'Service description is required';
        } else if (newBlock.value.service_description.length > 2000) {
            errs['service_NEW_service_description'] = 'Service description must be max 2000 characters';
        }

        if (!newBlock.value.service_location || newBlock.value.service_location.trim() === '') {
            errs['service_NEW_service_location'] = 'Service location is required';
        } else if (newBlock.value.service_location.length > 500) {
            errs['service_NEW_service_location'] = 'Service location must be max 500 characters';
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
    <section class="general-service-section space-y-6" data-testid="general-service-section">
        <!-- Request Date Header (G03 readonly/display) -->
        <div v-if="requestDate" class="bg-muted/30 p-3 rounded border text-sm flex justify-between items-center" data-testid="request-date-header">
            <span class="font-medium text-muted-foreground">Request Date:</span>
            <span class="font-semibold">{{ requestDate }}</span>
        </div>

        <!-- General Customer / Contact Details -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 class="text-base font-semibold tracking-tight border-b pb-2">Customer & Contact Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="customer-name" class="text-sm font-medium">
                        Customer Name <span class="text-destructive">*</span>
                    </label>
                    <input
                        id="customer-name"
                        v-model="customerName"
                        type="text"
                        maxlength="150"
                        data-testid="input-customer-name"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.customer_name" data-testid="error-customer-name" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.customer_name }}
                    </p>
                </div>

                <div class="space-y-1">
                    <label for="contact-name" class="text-sm font-medium">
                        Contact Name <span class="text-destructive">*</span>
                    </label>
                    <input
                        id="contact-name"
                        v-model="contactName"
                        type="text"
                        maxlength="150"
                        data-testid="input-contact-name"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.contact_name" data-testid="error-contact-name" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.contact_name }}
                    </p>
                </div>
            </div>

            <!-- Installation Date (RFS) -->
            <div class="space-y-1 pt-2">
                <div class="flex items-center justify-between">
                    <label for="installation-rfs-date" class="text-sm font-medium">
                        Installation Date (RFS)
                        <span v-if="isRfsRequired" class="text-destructive">*</span>
                    </label>
                    <span data-testid="indicator-rfs-date" class="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {{ isRfsRequired ? 'Required' : 'Optional' }}
                    </span>
                </div>
                <input
                    id="installation-rfs-date"
                    v-model="installationRfsDate"
                    type="date"
                    data-testid="input-installation-rfs-date"
                    class="w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :disabled="disabled"
                    :readonly="readonly"
                    @input="handleFieldInput"
                />
                <p v-if="errors.installation_rfs_date" data-testid="error-installation-rfs-date" class="text-xs text-destructive mt-1 font-medium">
                    {{ errors.installation_rfs_date }}
                </p>
            </div>
        </div>

        <!-- References Section -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 class="text-base font-semibold tracking-tight border-b pb-2">References</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="t in ALL_REFERENCE_TYPES" :key="t" class="p-3 border rounded-md space-y-2 bg-muted/10">
                    <div class="flex items-center space-x-2">
                        <input
                            :id="`ref-${t}`"
                            type="checkbox"
                            :checked="refSelected[t]"
                            :data-testid="`ref-checkbox-${t}`"
                            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            :disabled="disabled || readonly"
                            @change="(e) => handleReferenceToggle(t, (e.target as HTMLInputElement).checked)"
                        />
                        <label :for="`ref-${t}`" class="text-sm font-medium leading-none cursor-pointer">
                            {{ t }}
                        </label>
                    </div>

                    <div v-if="refSelected[t]" class="space-y-1 pl-6">
                        <label :for="`ref-spec-${t}`" class="text-xs text-muted-foreground">
                            Specification <span v-if="t === 'OTHER'" class="text-destructive">*</span>
                        </label>
                        <input
                            :id="`ref-spec-${t}`"
                            v-model="refSpecifications[t]"
                            type="text"
                            maxlength="255"
                            :data-testid="`ref-spec-input-${t}`"
                            :placeholder="t === 'OTHER' ? 'Specify reference details (required)' : 'Optional specification'"
                            class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            :disabled="disabled"
                            :readonly="readonly"
                            @input="handleFieldInput"
                        />
                        <p v-if="errors[`ref_${t}`]" :data-testid="`error-ref-${t}`" class="text-xs text-destructive mt-1 font-medium">
                            {{ errors[`ref_${t}`] }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXISTING Service Block -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm" data-testid="existing-service-block">
            <div class="flex items-center justify-between border-b pb-2">
                <h3 class="text-base font-semibold tracking-tight">EXISTING Service</h3>
                <span data-testid="indicator-existing-service" class="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {{ isExistingRequired ? 'Required' : 'Optional' }}
                </span>
            </div>

            <p v-if="errors.service_EXISTING" data-testid="error-service-EXISTING" class="text-xs text-destructive font-medium">
                {{ errors.service_EXISTING }}
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="existing-service-id" class="text-sm font-medium">
                        Service ID <span v-if="isExistingRequired || isBlockStarted(existingBlock)" class="text-destructive">*</span>
                    </label>
                    <input
                        id="existing-service-id"
                        v-model="existingBlock.service_id"
                        type="text"
                        maxlength="100"
                        data-testid="input-service-EXISTING-service_id"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.service_EXISTING_service_id" data-testid="error-service-EXISTING-service_id" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_EXISTING_service_id }}
                    </p>
                </div>

                <div class="space-y-1">
                    <label for="existing-service-status" class="text-sm font-medium">
                        Service Status <span v-if="isExistingRequired || isBlockStarted(existingBlock)" class="text-destructive">*</span>
                    </label>
                    <select
                        id="existing-service-status"
                        v-model="existingBlock.service_status"
                        data-testid="select-service-EXISTING-service_status"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @change="handleFieldInput"
                    >
                        <option value="">-- Select Status --</option>
                        <option value="ACTIVATED">ACTIVATED</option>
                        <option value="DEACTIVATED">DEACTIVATED</option>
                    </select>
                    <p v-if="errors.service_EXISTING_service_status" data-testid="error-service-EXISTING-service_status" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_EXISTING_service_status }}
                    </p>
                </div>

                <div class="space-y-1 md:col-span-2">
                    <label for="existing-service-description" class="text-sm font-medium">
                        Service Description <span v-if="isExistingRequired || isBlockStarted(existingBlock)" class="text-destructive">*</span>
                    </label>
                    <textarea
                        id="existing-service-description"
                        v-model="existingBlock.service_description"
                        rows="3"
                        maxlength="2000"
                        data-testid="input-service-EXISTING-service_description"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    ></textarea>
                    <p v-if="errors.service_EXISTING_service_description" data-testid="error-service-EXISTING-service_description" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_EXISTING_service_description }}
                    </p>
                </div>

                <div class="space-y-1 md:col-span-2">
                    <label for="existing-service-location" class="text-sm font-medium">
                        Service Location <span v-if="isExistingRequired || isBlockStarted(existingBlock)" class="text-destructive">*</span>
                    </label>
                    <input
                        id="existing-service-location"
                        v-model="existingBlock.service_location"
                        type="text"
                        maxlength="500"
                        data-testid="input-service-EXISTING-service_location"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.service_EXISTING_service_location" data-testid="error-service-EXISTING-service_location" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_EXISTING_service_location }}
                    </p>
                </div>
            </div>
        </div>

        <!-- NEW Service Block -->
        <div class="space-y-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm" data-testid="new-service-block">
            <div class="flex items-center justify-between border-b pb-2">
                <h3 class="text-base font-semibold tracking-tight">NEW Service</h3>
                <span data-testid="indicator-new-service" class="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {{ isNewRequired ? 'Required' : 'Optional' }}
                </span>
            </div>

            <p v-if="errors.service_NEW" data-testid="error-service-NEW" class="text-xs text-destructive font-medium">
                {{ errors.service_NEW }}
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                    <label for="new-service-id" class="text-sm font-medium">
                        Service ID <span v-if="isNewRequired || isBlockStarted(newBlock)" class="text-destructive">*</span>
                    </label>
                    <input
                        id="new-service-id"
                        v-model="newBlock.service_id"
                        type="text"
                        maxlength="100"
                        data-testid="input-service-NEW-service_id"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.service_NEW_service_id" data-testid="error-service-NEW-service_id" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_NEW_service_id }}
                    </p>
                </div>

                <div class="space-y-1">
                    <label for="new-service-status" class="text-sm font-medium">
                        Service Status <span v-if="isNewRequired || isBlockStarted(newBlock)" class="text-destructive">*</span>
                    </label>
                    <select
                        id="new-service-status"
                        v-model="newBlock.service_status"
                        data-testid="select-service-NEW-service_status"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @change="handleFieldInput"
                    >
                        <option value="">-- Select Status --</option>
                        <option value="ACTIVATED">ACTIVATED</option>
                        <option value="DEACTIVATED">DEACTIVATED</option>
                    </select>
                    <p v-if="errors.service_NEW_service_status" data-testid="error-service-NEW-service_status" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_NEW_service_status }}
                    </p>
                </div>

                <div class="space-y-1 md:col-span-2">
                    <label for="new-service-description" class="text-sm font-medium">
                        Service Description <span v-if="isNewRequired || isBlockStarted(newBlock)" class="text-destructive">*</span>
                    </label>
                    <textarea
                        id="new-service-description"
                        v-model="newBlock.service_description"
                        rows="3"
                        maxlength="2000"
                        data-testid="input-service-NEW-service_description"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    ></textarea>
                    <p v-if="errors.service_NEW_service_description" data-testid="error-service-NEW-service_description" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_NEW_service_description }}
                    </p>
                </div>

                <div class="space-y-1 md:col-span-2">
                    <label for="new-service-location" class="text-sm font-medium">
                        Service Location <span v-if="isNewRequired || isBlockStarted(newBlock)" class="text-destructive">*</span>
                    </label>
                    <input
                        id="new-service-location"
                        v-model="newBlock.service_location"
                        type="text"
                        maxlength="500"
                        data-testid="input-service-NEW-service_location"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        :disabled="disabled"
                        :readonly="readonly"
                        @input="handleFieldInput"
                    />
                    <p v-if="errors.service_NEW_service_location" data-testid="error-service-NEW-service_location" class="text-xs text-destructive mt-1 font-medium">
                        {{ errors.service_NEW_service_location }}
                    </p>
                </div>
            </div>
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
