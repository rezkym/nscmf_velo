<script setup lang="ts">
import DraftField from '../DraftField.vue';
import DraftNumberField from '../DraftNumberField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import RepeatableRows from '../RepeatableRows.vue';
import type { ActivationDraftFields, PriorityDestinationRow, SlaItemRow, VirtualConnectionRow } from '../types';

/** Specific requirements (SLA) and bandwidth (06 §28, §30). Each collection holds at most three rows. */
type BandwidthFields = Pick<
    ActivationDraftFields,
    | 'sla_items'
    | 'bandwidth_international_mbps'
    | 'bandwidth_domestic_iix_mbps'
    | 'bandwidth_mixed_mbps'
    | 'virtual_connections'
    | 'priority_destinations'
>;

const model = defineModel<BandwidthFields>({ required: true });

const props = withDefaults(defineProps<{ errors?: FieldErrors; disabled?: boolean }>(), { errors: () => ({}) });

const MAX_ROWS = 3;

function update(patch: Partial<BandwidthFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'activation', ...segments);
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <div>
                <h2 class="text-base font-semibold">Specific requirements (SLA)</h2>
                <p class="text-sm text-muted-foreground">Up to three requirements, 1,000 characters each.</p>
            </div>

            <RepeatableRows
                data-collection="sla_items"
                add-label="Add requirement"
                empty-hint="No requirements yet."
                :model-value="model.sla_items ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="(): SlaItemRow => ({ row_no: 0, requirement_text: null })"
                @update:model-value="(rows) => update({ sla_items: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <DraftField
                        :id="`sla_items-${index}-requirement_text`"
                        :label="`Requirement ${index + 1}`"
                        :rows="3"
                        :maxlength="1000"
                        :model-value="row.requirement_text ?? null"
                        :error="error('sla_items', index, 'requirement_text')"
                        :disabled="disabled"
                        @update:model-value="(value) => updateRow({ requirement_text: value })"
                    />
                </template>
            </RepeatableRows>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">Bandwidth</h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DraftNumberField
                    id="bandwidth_international_mbps"
                    label="International"
                    suffix="Mbps"
                    :model-value="model.bandwidth_international_mbps ?? null"
                    :error="error('bandwidth_international_mbps')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ bandwidth_international_mbps: value })"
                />
                <DraftNumberField
                    id="bandwidth_domestic_iix_mbps"
                    label="Domestic / IIX"
                    suffix="Mbps"
                    :model-value="model.bandwidth_domestic_iix_mbps ?? null"
                    :error="error('bandwidth_domestic_iix_mbps')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ bandwidth_domestic_iix_mbps: value })"
                />
                <DraftNumberField
                    id="bandwidth_mixed_mbps"
                    label="International & IIX mixed"
                    suffix="Mbps"
                    :model-value="model.bandwidth_mixed_mbps ?? null"
                    :error="error('bandwidth_mixed_mbps')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ bandwidth_mixed_mbps: value })"
                />
            </div>

            <div class="space-y-2 border-t border-border pt-4">
                <h3 class="text-sm font-medium">Virtual connections</h3>
                <RepeatableRows
                    data-collection="virtual_connections"
                    add-label="Add virtual connection"
                    empty-hint="No virtual connections yet."
                    :model-value="model.virtual_connections ?? []"
                    :max="MAX_ROWS"
                    :disabled="disabled"
                    :new-row="(): VirtualConnectionRow => ({ row_no: 0, bandwidth_mbps: null })"
                    @update:model-value="(rows) => update({ virtual_connections: rows })"
                >
                    <template #default="{ row, index, update: updateRow }">
                        <DraftNumberField
                            :id="`virtual_connections-${index}-bandwidth_mbps`"
                            :label="`VC #${index + 1}`"
                            suffix="Mbps"
                            :model-value="row.bandwidth_mbps ?? null"
                            :error="error('virtual_connections', index, 'bandwidth_mbps')"
                            :disabled="disabled"
                            @update:model-value="(value) => updateRow({ bandwidth_mbps: value })"
                        />
                    </template>
                </RepeatableRows>
            </div>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <div>
                <h2 class="text-base font-semibold">Priority destinations</h2>
                <p class="text-sm text-muted-foreground">Up to three destinations, free text.</p>
            </div>

            <RepeatableRows
                data-collection="priority_destinations"
                add-label="Add destination"
                empty-hint="No destinations yet."
                :model-value="model.priority_destinations ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="(): PriorityDestinationRow => ({ row_no: 0, destination: null })"
                @update:model-value="(rows) => update({ priority_destinations: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <DraftField
                        :id="`priority_destinations-${index}-destination`"
                        :label="`Destination ${index + 1}`"
                        :maxlength="255"
                        :model-value="row.destination ?? null"
                        :error="error('priority_destinations', index, 'destination')"
                        :disabled="disabled"
                        @update:model-value="(value) => updateRow({ destination: value })"
                    />
                </template>
            </RepeatableRows>
        </section>
    </div>
</template>
