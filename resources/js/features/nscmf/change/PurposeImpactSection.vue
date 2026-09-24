<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';

import DraftField from '../DraftField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import RepeatableRows from '../RepeatableRows.vue';
import type {
    ChangeDraftFields,
    ChangeSubtype,
    FacingChallengeRow,
    IdentifiedProblemRow,
    ServiceImpactCode,
} from '../types';
import { SERVICE_IMPACT_LABELS } from '../types';

/** Purpose, challenges, problems and service impact (06 §35-38). */
export type PurposeFields = Pick<
    ChangeDraftFields,
    'maintenance_purpose' | 'facing_challenges' | 'identified_problems' | 'service_impacts'
>;

const model = defineModel<PurposeFields>({ required: true });

const props = withDefaults(defineProps<{ subtype: ChangeSubtype; errors?: FieldErrors; disabled?: boolean }>(), {
    errors: () => ({}),
});

const MAX_ROWS = 3;

function update(patch: Partial<PurposeFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'change', ...segments);
}

function impacts(): NonNullable<PurposeFields['service_impacts']> {
    return model.value.service_impacts ?? [];
}

function isSelected(code: ServiceImpactCode): boolean {
    return impacts().some((impact) => impact.impact_code === code);
}

/** Selection is presence in the set; deselection removes the row instead of blanking its description (06 §14). */
function toggleImpact(code: ServiceImpactCode, selected: boolean): void {
    update({
        service_impacts: selected
            ? [...impacts(), { impact_code: code, other_description: null }]
            : impacts().filter((impact) => impact.impact_code !== code),
    });
}

function setOtherDescription(other_description: string | null): void {
    update({
        service_impacts: impacts().map((impact) =>
            impact.impact_code === 'OTHER' ? { ...impact, other_description } : impact,
        ),
    });
}

function otherIndex(): number {
    return impacts().findIndex((impact) => impact.impact_code === 'OTHER');
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 panel p-6">
            <h2 class="text-base font-semibold">Purpose of changes</h2>

            <DraftField
                id="maintenance_purpose"
                label="Maintenance purpose"
                :rows="4"
                :maxlength="4000"
                :required="subtype === 'MAINTENANCE'"
                :model-value="model.maintenance_purpose ?? null"
                :error="error('maintenance_purpose')"
                :disabled="disabled"
                @update:model-value="(value) => update({ maintenance_purpose: value })"
            />
        </section>

        <section class="space-y-4 panel p-6">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold">Facing challenges</h2>
                <Badge data-testid="requirement-facing_challenges">
                    {{ subtype === 'MAINTENANCE' ? 'Optional' : 'Required' }}
                </Badge>
            </div>

            <RepeatableRows
                data-collection="facing_challenges"
                add-label="Add challenge"
                empty-hint="No challenges yet."
                :model-value="model.facing_challenges ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="(): FacingChallengeRow => ({ row_no: 0, challenge_text: null })"
                @update:model-value="(rows) => update({ facing_challenges: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <DraftField
                        :id="`facing_challenges-${index}-challenge_text`"
                        :label="`Challenge ${index + 1}`"
                        :rows="3"
                        :maxlength="1000"
                        :model-value="row.challenge_text ?? null"
                        :error="error('facing_challenges', index, 'challenge_text')"
                        :disabled="disabled"
                        @update:model-value="(value) => updateRow({ challenge_text: value })"
                    />
                </template>
            </RepeatableRows>
        </section>

        <section class="space-y-4 panel p-6">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold">Identified problems</h2>
                <Badge data-testid="requirement-identified_problems">Required</Badge>
            </div>

            <RepeatableRows
                data-collection="identified_problems"
                add-label="Add problem"
                empty-hint="No problems yet."
                :model-value="model.identified_problems ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="(): IdentifiedProblemRow => ({ row_no: 0, problem_text: null })"
                @update:model-value="(rows) => update({ identified_problems: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <DraftField
                        :id="`identified_problems-${index}-problem_text`"
                        :label="`Problem ${index + 1}`"
                        :rows="3"
                        :maxlength="1000"
                        :model-value="row.problem_text ?? null"
                        :error="error('identified_problems', index, 'problem_text')"
                        :disabled="disabled"
                        @update:model-value="(value) => updateRow({ problem_text: value })"
                    />
                </template>
            </RepeatableRows>
        </section>

        <section class="space-y-4 panel p-6">
            <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold">Service impact</h2>
                <Badge data-testid="requirement-service_impacts">Required</Badge>
            </div>

            <div class="space-y-2">
                <label
                    v-for="(label, code) in SERVICE_IMPACT_LABELS"
                    :key="code"
                    class="flex items-center gap-2 text-sm"
                >
                    <input
                        type="checkbox"
                        :data-testid="`impact-${code}`"
                        :checked="isSelected(code)"
                        :disabled="disabled"
                        @change="toggleImpact(code, ($event.target as HTMLInputElement).checked)"
                    />
                    {{ label }}
                </label>
            </div>

            <DraftField
                v-if="isSelected('OTHER')"
                id="impact-OTHER-description"
                label="Other impact description"
                class="sm:max-w-md"
                required
                :maxlength="500"
                :model-value="impacts()[otherIndex()]?.other_description ?? null"
                :error="error('service_impacts', otherIndex(), 'other_description')"
                :disabled="disabled"
                @update:model-value="setOtherDescription"
            />
        </section>
    </div>
</template>
