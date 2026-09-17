<script lang="ts">
import type {
    FacingChallengeRow,
    IdentifiedProblemRow,
    ServiceImpactSelection,
} from '../draftPayload';

export type ChangeSubtype = 'Maintenance' | 'Upgrade' | 'Emergency';

export interface PurposeImpactModelValue {
    maintenance_purpose?: string | null;
    facing_challenges?: FacingChallengeRow[];
    identified_problems?: IdentifiedProblemRow[];
    service_impacts?: ServiceImpactSelection[];
    record_version?: number;
}

export interface PurposeImpactSectionProps {
    subtype?: ChangeSubtype;
    userTeam?: string;
    modelValue?: PurposeImpactModelValue;
    disabled?: boolean;
    readonly?: boolean;
}

export const IMPACT_OPTIONS: readonly ServiceImpactSelection['impact_code'][] = [
    'NOC15',
    'NOC23',
    'NOC361',
    'REGIONAL',
    'POP',
    'CUSTOMER',
    'OTHER',
] as const;
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
    buildDraftPayload,
    type ChangeDraftWirePayload,
} from '../draftPayload';

const props = withDefaults(defineProps<PurposeImpactSectionProps>(), {
    subtype: 'Maintenance',
    userTeam: undefined,
    modelValue: () => ({
        maintenance_purpose: null,
        facing_challenges: [],
        identified_problems: [],
        service_impacts: [],
        record_version: 1,
    }),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: PurposeImpactModelValue): void;
    (e: 'validate', errors: Record<string, string>): void;
}>();

// Internal reactive fields
const maintenancePurpose = ref<string>(props.modelValue?.maintenance_purpose || '');
const facingChallenges = ref<FacingChallengeRow[]>(
    props.modelValue?.facing_challenges ? JSON.parse(JSON.stringify(props.modelValue.facing_challenges)) : [],
);
const identifiedProblems = ref<IdentifiedProblemRow[]>(
    props.modelValue?.identified_problems ? JSON.parse(JSON.stringify(props.modelValue.identified_problems)) : [],
);
const serviceImpacts = ref<ServiceImpactSelection[]>(
    props.modelValue?.service_impacts ? JSON.parse(JSON.stringify(props.modelValue.service_impacts)) : [],
);

// Errors state for validation
const errors = ref<Record<string, string>>({});

// Keep local state in sync when props.modelValue changes externally
watch(
    () => props.modelValue,
    (newVal) => {
        if (!newVal) return;
        maintenancePurpose.value = newVal.maintenance_purpose || '';
        facingChallenges.value = newVal.facing_challenges ? JSON.parse(JSON.stringify(newVal.facing_challenges)) : [];
        identifiedProblems.value = newVal.identified_problems ? JSON.parse(JSON.stringify(newVal.identified_problems)) : [];
        serviceImpacts.value = newVal.service_impacts ? JSON.parse(JSON.stringify(newVal.service_impacts)) : [];
    },
    { deep: true },
);

function notifyUpdate() {
    emit('update:modelValue', {
        maintenance_purpose: maintenancePurpose.value.trim() ? maintenancePurpose.value : null,
        facing_challenges: facingChallenges.value.map((c, i) => ({
            row_no: c.row_no || i + 1,
            challenge_text: c.challenge_text ?? null,
        })),
        identified_problems: identifiedProblems.value.map((p, i) => ({
            row_no: p.row_no || i + 1,
            problem_text: p.problem_text ?? null,
        })),
        service_impacts: serviceImpacts.value.map((item) => ({
            impact_code: item.impact_code,
            other_description: item.impact_code === 'OTHER' ? (item.other_description ?? null) : null,
        })),
        record_version: props.modelValue?.record_version ?? 1,
    });
}

function isImpactSelected(code: ServiceImpactSelection['impact_code']): boolean {
    return serviceImpacts.value.some((item) => item.impact_code === code);
}

function getOtherDescription(): string {
    const found = serviceImpacts.value.find((item) => item.impact_code === 'OTHER');
    return found?.other_description || '';
}

function toggleImpact(code: ServiceImpactSelection['impact_code']) {
    if (props.disabled || props.readonly) return;
    const idx = serviceImpacts.value.findIndex((item) => item.impact_code === code);
    if (idx >= 0) {
        serviceImpacts.value.splice(idx, 1);
    } else {
        serviceImpacts.value.push({
            impact_code: code,
            other_description: code === 'OTHER' ? '' : null,
        });
    }
    notifyUpdate();
}

function updateOtherDescription(text: string) {
    if (props.disabled || props.readonly) return;
    const found = serviceImpacts.value.find((item) => item.impact_code === 'OTHER');
    if (found) {
        found.other_description = text;
    } else {
        serviceImpacts.value.push({
            impact_code: 'OTHER',
            other_description: text,
        });
    }
    notifyUpdate();
}

function addChallenge() {
    if (facingChallenges.value.length >= 3 || props.disabled || props.readonly) return;
    const nextRowNo = facingChallenges.value.length + 1;
    facingChallenges.value.push({
        row_no: nextRowNo,
        challenge_text: '',
    });
    notifyUpdate();
}

function removeChallenge(index: number) {
    if (props.disabled || props.readonly) return;
    facingChallenges.value.splice(index, 1);
    // Re-index row_no to maintain sequential 1..N natural keys
    facingChallenges.value.forEach((row, i) => {
        row.row_no = i + 1;
    });
    notifyUpdate();
}

function addProblem() {
    if (identifiedProblems.value.length >= 3 || props.disabled || props.readonly) return;
    const nextRowNo = identifiedProblems.value.length + 1;
    identifiedProblems.value.push({
        row_no: nextRowNo,
        problem_text: '',
    });
    notifyUpdate();
}

function removeProblem(index: number) {
    if (props.disabled || props.readonly) return;
    identifiedProblems.value.splice(index, 1);
    // Re-index row_no
    identifiedProblems.value.forEach((row, i) => {
        row.row_no = i + 1;
    });
    notifyUpdate();
}

// Validation logic for Submit Action
function validateSubmit(): boolean {
    const newErrors: Record<string, string> = {};

    // AC1: Purpose Subtype Matrix
    if (props.subtype === 'Maintenance') {
        if (!maintenancePurpose.value || !maintenancePurpose.value.trim()) {
            newErrors.maintenance_purpose = 'Maintenance purpose is required for Maintenance';
        }
    }

    if (maintenancePurpose.value && maintenancePurpose.value.length > 4000) {
        newErrors.maintenance_purpose = 'Maintenance purpose must not exceed 4000 characters';
    }

    // AC1: Facing Challenges
    const nonBlankChallenges = facingChallenges.value.filter(
        (c) => typeof c.challenge_text === 'string' && c.challenge_text.trim().length > 0,
    );
    if (props.subtype === 'Upgrade' || props.subtype === 'Emergency') {
        if (nonBlankChallenges.length === 0) {
            newErrors.facing_challenges = 'At least one challenge is required for Upgrade/Emergency';
        }
    }
    for (const c of facingChallenges.value) {
        if (c.challenge_text && c.challenge_text.length > 1000) {
            newErrors.facing_challenges = 'Each facing challenge must not exceed 1000 characters';
            break;
        }
    }

    // AC1: Identified Problems (>= 1 for all subtypes)
    const nonBlankProblems = identifiedProblems.value.filter(
        (p) => typeof p.problem_text === 'string' && p.problem_text.trim().length > 0,
    );
    if (nonBlankProblems.length === 0) {
        newErrors.identified_problems = 'At least one identified problem is required';
    }
    for (const p of identifiedProblems.value) {
        if (p.problem_text && p.problem_text.length > 1000) {
            newErrors.identified_problems = 'Each identified problem must not exceed 1000 characters';
            break;
        }
    }

    // AC1 & AC2: Service Impacts (>= 1 for all subtypes)
    if (serviceImpacts.value.length === 0) {
        newErrors.service_impacts = 'At least one service impact must be selected';
    }

    // AC3: OTHER description validation
    const otherImpact = serviceImpacts.value.find((item) => item.impact_code === 'OTHER');
    if (otherImpact) {
        const desc = otherImpact.other_description?.trim() || '';
        if (!desc) {
            newErrors.other_description = 'Other description is required when OTHER impact is selected';
        } else if (desc.length > 500) {
            newErrors.other_description = 'Other description must not exceed 500 characters';
        }
    }

    errors.value = newErrors;
    emit('validate', newErrors);
    return Object.keys(newErrors).length === 0;
}

// Method to get wire draft payload using buildDraftPayload helper from draftPayload.ts
function getDraftPayload(): ChangeDraftWirePayload['change'] {
    const payload = buildDraftPayload({
        family: 'CHANGE',
        record_version: props.modelValue?.record_version ?? 1,
        change: {
            maintenance_purpose: maintenancePurpose.value.trim() ? maintenancePurpose.value : null,
            facing_challenges: facingChallenges.value.map((c, i) => ({
                row_no: c.row_no || i + 1,
                challenge_text: c.challenge_text ?? null,
            })),
            identified_problems: identifiedProblems.value.map((p, i) => ({
                row_no: p.row_no || i + 1,
                problem_text: p.problem_text ?? null,
            })),
            service_impacts: serviceImpacts.value.map((item) => ({
                impact_code: item.impact_code,
                other_description: item.impact_code === 'OTHER' ? (item.other_description?.trim() ? item.other_description : null) : null,
            })),
        },
    });
    return payload.change;
}

defineExpose({
    validateSubmit,
    getDraftPayload,
    errors,
});
</script>

<template>
    <div class="purpose-impact-section space-y-6">
        <!-- Subtype Notice / Header -->
        <div class="section-header flex items-center justify-between pb-2 border-b">
            <div>
                <h3 class="text-lg font-semibold text-foreground">Change Purpose, Problems & Service Impacts</h3>
                <p class="text-sm text-muted-foreground">Subtype: <span class="font-medium text-foreground">{{ subtype }}</span></p>
            </div>
            <!-- Test trigger button for submit validation -->
            <button
                type="button"
                data-testid="validate-submit-btn"
                class="hidden"
                @click="validateSubmit"
            >
                Validate Submit
            </button>
        </div>

        <!-- Maintenance Purpose Field (Required for Maintenance, optional for Upgrade/Emergency) -->
        <div class="form-group space-y-1.5" data-testid="maintenance-purpose-group">
            <label for="maintenance-purpose-input" class="text-sm font-medium text-foreground flex items-center">
                Maintenance Purpose
                <span v-if="subtype === 'Maintenance'" class="text-destructive font-bold ml-1" data-testid="purpose-required-asterisk">*</span>
                <span class="text-xs text-muted-foreground ml-2">(Max 4,000 chars)</span>
            </label>
            <textarea
                id="maintenance-purpose-input"
                data-testid="maintenance-purpose-input"
                v-model="maintenancePurpose"
                :disabled="disabled || readonly"
                maxlength="4000"
                rows="3"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Explain the purpose of this change..."
                @input="notifyUpdate"
            />
            <p v-if="errors.maintenance_purpose" class="text-xs font-medium text-destructive" role="alert">
                {{ errors.maintenance_purpose }}
            </p>
        </div>

        <!-- Facing Challenges (Max 3, Each Max 1000) -->
        <div class="form-group space-y-3" data-testid="facing-challenges-group">
            <div class="flex items-center justify-between">
                <div>
                    <label class="text-sm font-medium text-foreground flex items-center">
                        Facing Challenges
                        <span v-if="subtype === 'Upgrade' || subtype === 'Emergency'" class="text-destructive font-bold ml-1" data-testid="challenges-required-asterisk">*</span>
                        <span class="text-xs text-muted-foreground ml-2">(Max 3 rows, 1,000 chars each)</span>
                    </label>
                </div>
                <button
                    type="button"
                    data-testid="add-challenge-btn"
                    :disabled="facingChallenges.length >= 3 || disabled || readonly"
                    class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                    @click="addChallenge"
                >
                    + Add Challenge
                </button>
            </div>

            <p v-if="errors.facing_challenges" class="text-xs font-medium text-destructive" role="alert">
                {{ errors.facing_challenges }}
            </p>

            <div v-if="facingChallenges.length === 0" class="text-xs text-muted-foreground italic py-2">
                No challenges added. (Draft accepts 0 rows)
            </div>

            <div v-for="(challenge, index) in facingChallenges" :key="challenge.row_no || index" class="flex items-start gap-2">
                <span class="text-xs font-semibold text-muted-foreground pt-2.5 w-6 text-center">#{{ challenge.row_no }}</span>
                <div class="flex-1">
                    <input
                        type="text"
                        :data-testid="`challenge-input-${index}`"
                        v-model="challenge.challenge_text"
                        :disabled="disabled || readonly"
                        maxlength="1000"
                        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Describe facing challenge..."
                        @input="notifyUpdate"
                    />
                </div>
                <button
                    v-if="!disabled && !readonly"
                    type="button"
                    :data-testid="`remove-challenge-btn-${index}`"
                    class="text-destructive text-xs hover:underline pt-2 px-2"
                    @click="removeChallenge(index)"
                >
                    Remove
                </button>
            </div>
        </div>

        <!-- Identified Problems (Max 3, Each Max 1000) -->
        <div class="form-group space-y-3" data-testid="identified-problems-group">
            <div class="flex items-center justify-between">
                <div>
                    <label class="text-sm font-medium text-foreground flex items-center">
                        Identified Problems
                        <span class="text-destructive font-bold ml-1">*</span>
                        <span class="text-xs text-muted-foreground ml-2">(Max 3 rows, 1,000 chars each)</span>
                    </label>
                </div>
                <button
                    type="button"
                    data-testid="add-problem-btn"
                    :disabled="identifiedProblems.length >= 3 || disabled || readonly"
                    class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
                    @click="addProblem"
                >
                    + Add Problem
                </button>
            </div>

            <p v-if="errors.identified_problems" class="text-xs font-medium text-destructive" role="alert">
                {{ errors.identified_problems }}
            </p>

            <div v-if="identifiedProblems.length === 0" class="text-xs text-muted-foreground italic py-2">
                No problems added. (Draft accepts 0 rows)
            </div>

            <div v-for="(problem, index) in identifiedProblems" :key="problem.row_no || index" class="flex items-start gap-2">
                <span class="text-xs font-semibold text-muted-foreground pt-2.5 w-6 text-center">#{{ problem.row_no }}</span>
                <div class="flex-1">
                    <input
                        type="text"
                        :data-testid="`problem-input-${index}`"
                        v-model="problem.problem_text"
                        :disabled="disabled || readonly"
                        maxlength="1000"
                        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Describe identified problem..."
                        @input="notifyUpdate"
                    />
                </div>
                <button
                    v-if="!disabled && !readonly"
                    type="button"
                    :data-testid="`remove-problem-btn-${index}`"
                    class="text-destructive text-xs hover:underline pt-2 px-2"
                    @click="removeProblem(index)"
                >
                    Remove
                </button>
            </div>
        </div>

        <!-- Service Impacts Multi-Select (7 options, NOC15/23/361/REGIONAL/POP/CUSTOMER/OTHER) -->
        <div class="form-group space-y-3" data-testid="service-impacts-group">
            <div>
                <label class="text-sm font-medium text-foreground flex items-center">
                    Service Impacts
                    <span class="text-destructive font-bold ml-1">*</span>
                    <span class="text-xs text-muted-foreground ml-2">(Multiselect; Team does NOT filter impact options)</span>
                </label>
            </div>

            <p v-if="errors.service_impacts" class="text-xs font-medium text-destructive" role="alert">
                {{ errors.service_impacts }}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div
                    v-for="impactCode in IMPACT_OPTIONS"
                    :key="impactCode"
                    class="flex items-center space-x-2"
                >
                    <input
                        type="checkbox"
                        :id="`impact-checkbox-${impactCode}`"
                        :data-testid="`impact-${impactCode}`"
                        :checked="isImpactSelected(impactCode)"
                        :disabled="disabled || readonly"
                        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                        @click="toggleImpact(impactCode)"
                    />
                    <label
                        :for="`impact-checkbox-${impactCode}`"
                        class="text-xs font-medium text-foreground cursor-pointer select-none"
                    >
                        {{ impactCode }}
                    </label>
                </div>
            </div>

            <!-- OTHER Description Field (Visible when OTHER selected or configured) -->
            <div v-if="isImpactSelected('OTHER')" class="space-y-1.5 pt-2" data-testid="other-description-container">
                <label for="other-description-input" class="text-xs font-medium text-foreground flex items-center">
                    Other Impact Description
                    <span class="text-destructive font-bold ml-1">*</span>
                    <span class="text-xs text-muted-foreground ml-2">(Required on submit, max 500 chars)</span>
                </label>
                <input
                    id="other-description-input"
                    type="text"
                    data-testid="other-description-input"
                    :value="getOtherDescription()"
                    :disabled="disabled || readonly"
                    maxlength="501"
                    class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Specify other service impact details..."
                    @input="updateOtherDescription(($event.target as HTMLInputElement).value)"
                />
                <p v-if="errors.other_description" class="text-xs font-medium text-destructive" role="alert">
                    {{ errors.other_description }}
                </p>
            </div>
        </div>
    </div>
</template>
