<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import { computed } from 'vue';

import DraftField from '../DraftField.vue';
import { buildActivationDraftPayload } from '../draftPayload';
import { fieldError, type FieldErrors } from '../fieldErrors';
import type {
    ActivationDraftFields,
    ActivationSubtype,
    ReferenceType,
    ServiceBlockRow,
    ServiceContext,
    ServiceStatus,
} from '../types';
import { REFERENCE_TYPE_LABELS, SERVICE_STATUS_LABELS } from '../types';

/** Customer, references and the two service blocks (06 §24-27). */
export type GeneralFields = Pick<
    ActivationDraftFields,
    'customer_name' | 'contact_name' | 'installation_rfs_date' | 'references' | 'service_blocks'
>;

const model = defineModel<GeneralFields>({ required: true });

const props = withDefaults(defineProps<{ subtype: ActivationSubtype; errors?: FieldErrors; disabled?: boolean }>(), {
    errors: () => ({}),
});

/** Which service block a subtype requires at Submit (06 §26). A draft may still be incomplete. */
const REQUIRED_BLOCKS: Record<ActivationSubtype, Record<ServiceContext, boolean>> = {
    ACTIVATION: { EXISTING: false, NEW: true },
    UPGRADE_DOWNGRADE: { EXISTING: true, NEW: true },
    DEACTIVATION: { EXISTING: true, NEW: false },
};

const SERVICE_BLOCKS: { context: ServiceContext; key: 'existing' | 'new'; title: string }[] = [
    { context: 'EXISTING', key: 'existing', title: 'Existing service' },
    { context: 'NEW', key: 'new', title: 'New service' },
];

function update(patch: Partial<GeneralFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'activation', ...segments);
}

function references(): NonNullable<GeneralFields['references']> {
    return model.value.references ?? [];
}

function isSelected(type: ReferenceType): boolean {
    return references().some((reference) => reference.reference_type === type);
}

/** Selection is presence in the set; deselection removes the row instead of blanking its specification (06 §14). */
function toggleReference(type: ReferenceType, selected: boolean): void {
    update({
        references: selected
            ? [...references(), { reference_type: type, specification: null }]
            : references().filter((reference) => reference.reference_type !== type),
    });
}

function setSpecification(type: ReferenceType, specification: string | null): void {
    update({
        references: references().map((reference) =>
            reference.reference_type === type ? { ...reference, specification } : reference,
        ),
    });
}

function referenceIndex(type: ReferenceType): number {
    return references().findIndex((reference) => reference.reference_type === type);
}

function blocks(): ServiceBlockRow[] {
    return model.value.service_blocks ?? [];
}

function block(context: ServiceContext): ServiceBlockRow | undefined {
    return blocks().find((row) => row.service_context === context);
}

function blockIndex(context: ServiceContext): number {
    return persistedBlocks.value.findIndex((row) => row.service_context === context);
}

function blockPath(context: ServiceContext, field: string): string | undefined {
    const index = blockIndex(context);
    return index < 0 ? undefined : `activation.service_blocks.${index}.${field}`;
}

// Match validation indices to the exact set emitted by the draft payload builder.
const persistedBlocks = computed(
    () =>
        buildActivationDraftPayload(1, { service_blocks: model.value.service_blocks }).activation.service_blocks ?? [],
);

/** The block joins the set on its first edit and leaves it only on an explicit clear. */
function updateBlock(context: ServiceContext, patch: Partial<ServiceBlockRow>): void {
    const index = blocks().findIndex((row) => row.service_context === context);
    update({
        service_blocks:
            index === -1
                ? [...blocks(), { service_context: context, ...patch }]
                : blocks().map((row, position) => (position === index ? { ...row, ...patch } : row)),
    });
}

function clearBlock(context: ServiceContext): void {
    update({ service_blocks: blocks().filter((row) => row.service_context !== context) });
}

function onStatusChange(context: ServiceContext, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    updateBlock(context, { service_status: value === '' ? null : (value as ServiceStatus) });
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 panel p-6">
            <h2 class="text-base font-semibold">Customer and request</h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="customer_name"
                    label="Customer name"
                    required
                    :maxlength="150"
                    :model-value="model.customer_name ?? null"
                    :error="error('customer_name')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ customer_name: value })"
                />
                <DraftField
                    id="contact_name"
                    label="Contact name"
                    required
                    :maxlength="150"
                    :model-value="model.contact_name ?? null"
                    :error="error('contact_name')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ contact_name: value })"
                />
                <DraftField
                    id="installation_rfs_date"
                    label="Installation (RFS) date"
                    type="date"
                    :required="subtype !== 'DEACTIVATION'"
                    :model-value="model.installation_rfs_date ?? null"
                    :error="error('installation_rfs_date')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ installation_rfs_date: value })"
                />
            </div>
        </section>

        <section class="space-y-4 panel p-6">
            <div>
                <h2 class="text-base font-semibold">References</h2>
                <p class="text-sm text-muted-foreground">Select any that apply. Other needs a specification.</p>
            </div>

            <div class="space-y-3">
                <div v-for="(label, type) in REFERENCE_TYPE_LABELS" :key="type" class="space-y-2">
                    <label class="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            :data-testid="`reference-${type}`"
                            :checked="isSelected(type)"
                            :disabled="disabled"
                            @change="toggleReference(type, ($event.target as HTMLInputElement).checked)"
                        />
                        {{ label }}
                    </label>
                    <DraftField
                        v-if="type === 'OTHER' && isSelected(type)"
                        id="reference-OTHER-specification"
                        error-path="activation.references.OTHER.specification"
                        :error-wire-path="`activation.references.${referenceIndex(type)}.specification`"
                        label="Specification"
                        class="sm:max-w-md"
                        :maxlength="255"
                        :model-value="references()[referenceIndex(type)]?.specification ?? null"
                        :error="error('references', referenceIndex(type), 'specification')"
                        :disabled="disabled"
                        @update:model-value="(value) => setSpecification(type, value)"
                    />
                </div>
            </div>
        </section>

        <section v-for="service in SERVICE_BLOCKS" :key="service.context" class="space-y-4 panel p-6">
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                    <h2 class="text-base font-semibold">{{ service.title }}</h2>
                    <Badge :data-testid="`requirement-${service.key}`">
                        {{ REQUIRED_BLOCKS[subtype][service.context] ? 'Required' : 'Optional' }}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    :data-testid="`btn-clear-service-${service.key}`"
                    :disabled="disabled"
                    @click="clearBlock(service.context)"
                >
                    Clear block
                </Button>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    :id="`service-${service.key}-service_id`"
                    :error-path="`activation.service_blocks.${service.context}.service_id`"
                    :error-wire-path="blockPath(service.context, 'service_id')"
                    label="Service ID"
                    :maxlength="100"
                    :required="REQUIRED_BLOCKS[subtype][service.context]"
                    :model-value="block(service.context)?.service_id ?? null"
                    :error="error('service_blocks', blockIndex(service.context), 'service_id')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateBlock(service.context, { service_id: value })"
                />

                <FormField
                    :id="`service-${service.key}-service_status`"
                    label="Service status"
                    :required="REQUIRED_BLOCKS[subtype][service.context]"
                    :error="error('service_blocks', blockIndex(service.context), 'service_status')"
                >
                    <template #default="{ id, describedBy }">
                        <select
                            :id="id"
                            :data-error-path="`activation.service_blocks.${service.context}.service_status`"
                            :data-error-wire-path="blockPath(service.context, 'service_status')"
                            :value="block(service.context)?.service_status ?? ''"
                            :disabled="disabled"
                            :aria-describedby="describedBy"
                            :class="controlClass"
                            @change="onStatusChange(service.context, $event)"
                        >
                            <option value="">Not selected</option>
                            <option v-for="(label, status) in SERVICE_STATUS_LABELS" :key="status" :value="status">
                                {{ label }}
                            </option>
                        </select>
                    </template>
                </FormField>

                <DraftField
                    :id="`service-${service.key}-service_description`"
                    :error-path="`activation.service_blocks.${service.context}.service_description`"
                    :error-wire-path="blockPath(service.context, 'service_description')"
                    label="Service description"
                    class="sm:col-span-2"
                    :rows="3"
                    :maxlength="2000"
                    :required="REQUIRED_BLOCKS[subtype][service.context]"
                    :model-value="block(service.context)?.service_description ?? null"
                    :error="error('service_blocks', blockIndex(service.context), 'service_description')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateBlock(service.context, { service_description: value })"
                />

                <DraftField
                    :id="`service-${service.key}-service_location`"
                    :error-path="`activation.service_blocks.${service.context}.service_location`"
                    :error-wire-path="blockPath(service.context, 'service_location')"
                    label="Service location"
                    class="sm:col-span-2"
                    :maxlength="500"
                    :required="REQUIRED_BLOCKS[subtype][service.context]"
                    :model-value="block(service.context)?.service_location ?? null"
                    :error="error('service_blocks', blockIndex(service.context), 'service_location')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateBlock(service.context, { service_location: value })"
                />
            </div>
        </section>
    </div>
</template>
