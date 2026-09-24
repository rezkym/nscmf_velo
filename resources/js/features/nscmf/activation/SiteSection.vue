<script setup lang="ts">
import Button from '@/components/ui/Button.vue';

import DraftField from '../DraftField.vue';
import DraftNumberField from '../DraftNumberField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import type { ActivationDraftFields, DirectSiteBlock, PopSiteBlock } from '../types';

/** Customer site blocks (06 §32-33). Both are optional 1:1 objects; `null` clears one (12 §27.1). */
export type SiteFields = Pick<ActivationDraftFields, 'direct_site' | 'pop_site'>;

const model = defineModel<SiteFields>({ required: true });

const props = withDefaults(defineProps<{ errors?: FieldErrors; disabled?: boolean }>(), { errors: () => ({}) });

const TEXT_MAX = 255;

function updateDirect(patch: Partial<DirectSiteBlock>): void {
    model.value = { ...model.value, direct_site: { ...(model.value.direct_site ?? {}), ...patch } };
}

function updatePop(patch: Partial<PopSiteBlock>): void {
    model.value = { ...model.value, pop_site: { ...(model.value.pop_site ?? {}), ...patch } };
}

function directError(key: keyof DirectSiteBlock): string | undefined {
    return fieldError(props.errors, 'activation.direct_site', key);
}

function popError(key: keyof PopSiteBlock): string | undefined {
    return fieldError(props.errors, 'activation.pop_site', key);
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 panel p-6">
            <div class="flex items-center justify-between gap-4">
                <h2 class="text-base font-semibold">Customer site (direct)</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    data-testid="btn-clear-direct-site"
                    :disabled="disabled"
                    @click="model = { ...model, direct_site: null }"
                >
                    Clear block
                </Button>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="direct_site-local_loops"
                    label="Local loops"
                    :model-value="model.direct_site?.local_loops ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('local_loops')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ local_loops: value })"
                />
                <DraftField
                    id="direct_site-lastmile"
                    label="Last mile"
                    :model-value="model.direct_site?.lastmile ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('lastmile')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ lastmile: value })"
                />
                <DraftField
                    id="direct_site-bwa"
                    label="BWA"
                    :model-value="model.direct_site?.bwa ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('bwa')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ bwa: value })"
                />
                <DraftField
                    id="direct_site-antenna_tower"
                    label="Antenna / tower"
                    :model-value="model.direct_site?.antenna_tower ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('antenna_tower')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ antenna_tower: value })"
                />
                <DraftField
                    id="direct_site-direction"
                    label="Direction"
                    :model-value="model.direct_site?.direction ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('direction')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ direction: value })"
                />
                <DraftNumberField
                    id="direct_site-rssi"
                    label="RSSI"
                    :model-value="model.direct_site?.rssi ?? null"
                    :error="directError('rssi')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ rssi: value })"
                />
                <DraftNumberField
                    id="direct_site-latency_ms"
                    label="Latency"
                    suffix="ms"
                    :min="0"
                    :model-value="model.direct_site?.latency_ms ?? null"
                    :error="directError('latency_ms')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ latency_ms: value })"
                />
                <DraftNumberField
                    id="direct_site-packet_loss_percent"
                    label="Packet loss"
                    suffix="%"
                    :min="0"
                    :max="100"
                    :model-value="model.direct_site?.packet_loss_percent ?? null"
                    :error="directError('packet_loss_percent')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ packet_loss_percent: value })"
                />
                <DraftField
                    id="direct_site-routers"
                    label="Routers"
                    :model-value="model.direct_site?.routers ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('routers')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ routers: value })"
                />
                <DraftField
                    id="direct_site-ups"
                    label="UPS"
                    :model-value="model.direct_site?.ups ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('ups')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ ups: value })"
                />
                <DraftField
                    id="direct_site-stabilizer"
                    label="Stabilizer"
                    :model-value="model.direct_site?.stabilizer ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('stabilizer')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ stabilizer: value })"
                />
                <DraftField
                    id="direct_site-cable"
                    label="Cable"
                    :model-value="model.direct_site?.cable ?? null"
                    :maxlength="TEXT_MAX"
                    :error="directError('cable')"
                    :disabled="disabled"
                    @update:model-value="(value) => updateDirect({ cable: value })"
                />
            </div>
        </section>

        <section class="space-y-4 panel p-6">
            <div class="flex items-center justify-between gap-4">
                <h2 class="text-base font-semibold">Customer site at POP</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    data-testid="btn-clear-pop-site"
                    :disabled="disabled"
                    @click="model = { ...model, pop_site: null }"
                >
                    Clear block
                </Button>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DraftField
                    id="pop_site-switch_distribution"
                    label="Switch distribution"
                    :model-value="model.pop_site?.switch_distribution ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('switch_distribution')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ switch_distribution: value })"
                />
                <DraftField
                    id="pop_site-port"
                    label="Port"
                    :model-value="model.pop_site?.port ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('port')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ port: value })"
                />
                <DraftNumberField
                    id="pop_site-vlan_id"
                    label="VLAN ID"
                    :min="1"
                    :max="4094"
                    :model-value="model.pop_site?.vlan_id ?? null"
                    :error="popError('vlan_id')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ vlan_id: value })"
                />
                <DraftField
                    id="pop_site-local_loops"
                    label="Local loops"
                    :model-value="model.pop_site?.local_loops ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('local_loops')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ local_loops: value })"
                />
                <DraftField
                    id="pop_site-routers"
                    label="Routers"
                    :model-value="model.pop_site?.routers ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('routers')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ routers: value })"
                />
                <DraftField
                    id="pop_site-cpe_indoor"
                    label="CPE indoor"
                    :model-value="model.pop_site?.cpe_indoor ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('cpe_indoor')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ cpe_indoor: value })"
                />
                <DraftField
                    id="pop_site-cpe_outdoor"
                    label="CPE outdoor"
                    :model-value="model.pop_site?.cpe_outdoor ?? null"
                    :maxlength="TEXT_MAX"
                    :error="popError('cpe_outdoor')"
                    :disabled="disabled"
                    @update:model-value="(value) => updatePop({ cpe_outdoor: value })"
                />
            </div>
        </section>
    </div>
</template>
