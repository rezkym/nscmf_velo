<script lang="ts">
import type { FacingChallengeRow, IdentifiedProblemRow, ServiceImpactSelection } from '../draftPayload';

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

export const VALID_IMPACTS_SET = new Set<string>(IMPACT_OPTIONS);
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { buildDraftPayload, type ChangeDraftWirePayload } from '../draftPayload';

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

// F-24-9: Dirty state tracking
const isDirty = ref<boolean>(false);

// Canonical subtype mapping and validation (F-24-1)
type CanonicalChangeSubtype = 'Maintenance' | 'Upgrade' | 'Emergency';

const normalizedSubtype = computed<CanonicalChangeSubtype | null>(() => {
    const raw = props.subtype as string | undefined;
    if (raw === undefined || raw === null) return 'Maintenance';
    const trimmed = raw.trim();
    if (trimmed === 'Maintenance' || trimmed === 'MAINTENANCE' || trimmed === 'maintenance') {
        return 'Maintenance';
    }
    if (trimmed === 'Upgrade' || trimmed === 'UPGRADE' || trimmed === 'upgrade') {
        return 'Upgrade';
    }
    if (trimmed === 'Emergency' || trimmed === 'EMERGENCY' || trimmed === 'emergency') {
        return 'Emergency';
    }
    return null;
});

// Helper to sanitize incoming modelValue and guard types (F-24-11, F-24-5, F-24-2)
const incomingHasChallenges = ref<boolean>(false);
const incomingHasProblems = ref<boolean>(false);
const incomingHasImpacts = ref<boolean>(false);
const invalidImpactCodes = ref<string[]>([]);

function sanitizePurpose(val: unknown): string {
    if (typeof val === 'string') return val;
    return '';
}

function sanitizeChallenges(val: unknown): FacingChallengeRow[] {
    if (!Array.isArray(val)) return [];
    return val
        .slice(0, 3)
        .map((c, i) => {
            if (!c || typeof c !== 'object') return { row_no: i + 1, challenge_text: '' };
            const rowNo = typeof c.row_no === 'number' && c.row_no >= 1 && c.row_no <= 3 ? c.row_no : i + 1;
            const text = typeof c.challenge_text === 'string' ? c.challenge_text : '';
            return { row_no: rowNo, challenge_text: text };
        });
}

function sanitizeProblems(val: unknown): IdentifiedProblemRow[] {
    if (!Array.isArray(val)) return [];
    return val
        .slice(0, 3)
        .map((p, i) => {
            if (!p || typeof p !== 'object') return { row_no: i + 1, problem_text: '' };
            const rowNo = typeof p.row_no === 'number' && p.row_no >= 1 && p.row_no <= 3 ? p.row_no : i + 1;
            const text = typeof p.problem_text === 'string' ? p.problem_text : '';
            return { row_no: rowNo, problem_text: text };
        });
}

function sanitizeImpacts(val: unknown): ServiceImpactSelection[] {
    invalidImpactCodes.value = [];
    if (!Array.isArray(val)) return [];
    const list: ServiceImpactSelection[] = [];
    for (const item of val) {
        if (!item || typeof item !== 'object') continue;
        const code = (item.impact_code ?? '') as string;
        if (!VALID_IMPACTS_SET.has(code)) {
            if (code) invalidImpactCodes.value.push(code);
            continue;
        }
        const desc = typeof item.other_description === 'string' ? item.other_description : null;
        list.push({
            impact_code: code as ServiceImpactSelection['impact_code'],
            other_description: code === 'OTHER' ? desc : null,
        });
    }
    return list;
}

// Internal reactive fields
const maintenancePurpose = ref<string>(sanitizePurpose(props.modelValue?.maintenance_purpose));
const facingChallenges = ref<FacingChallengeRow[]>(sanitizeChallenges(props.modelValue?.facing_challenges));
const identifiedProblems = ref<IdentifiedProblemRow[]>(sanitizeProblems(props.modelValue?.identified_problems));
const serviceImpacts = ref<ServiceImpactSelection[]>(sanitizeImpacts(props.modelValue?.service_impacts));

function updateIncomingFlags(mv?: PurposeImpactModelValue | null) {
    if (!mv) {
        incomingHasChallenges.value = false;
        incomingHasProblems.value = false;
        incomingHasImpacts.value = false;
        return;
    }
    incomingHasChallenges.value = Object.hasOwn(mv, 'facing_challenges') && mv.facing_challenges !== undefined;
    incomingHasProblems.value = Object.hasOwn(mv, 'identified_problems') && mv.identified_problems !== undefined;
    incomingHasImpacts.value = Object.hasOwn(mv, 'service_impacts') && mv.service_impacts !== undefined;
}
updateIncomingFlags(props.modelValue);

// Errors state for validation
const errors = ref<Record<string, string>>({});

function syncFromProps(val?: PurposeImpactModelValue | null) {
    updateIncomingFlags(val);
    maintenancePurpose.value = sanitizePurpose(val?.maintenance_purpose);
    facingChallenges.value = sanitizeChallenges(val?.facing_challenges);
    identifiedProblems.value = sanitizeProblems(val?.identified_problems);
    serviceImpacts.value = sanitizeImpacts(val?.service_impacts);
}

// Keep local state in sync when props.modelValue changes externally (guard against clobbering in-flight user edits F-24-9)
watch(
    () => props.modelValue,
    (newVal) => {
        if (!isDirty.value) {
            syncFromProps(newVal);
        } else {
            updateIncomingFlags(newVal);
            if (newVal) {
                // If modelValue updated collections externally with >=3 rows, sync collections
                if (Array.isArray(newVal.facing_challenges)) {
                    facingChallenges.value = sanitizeChallenges(newVal.facing_challenges);
                }
                if (Array.isArray(newVal.identified_problems)) {
                    identifiedProblems.value = sanitizeProblems(newVal.identified_problems);
                }
            }
        }
    },
    { deep: true },
);

// F-24-12: clear stale errors when subtype changes
watch(
    () => props.subtype,
    () => {
        delete errors.value.subtype;
        delete errors.value.maintenance_purpose;
        delete errors.value.facing_challenges;
    },
);

function notifyUpdate() {
    const payload: PurposeImpactModelValue = {
        maintenance_purpose: maintenancePurpose.value.trim() ? maintenancePurpose.value : null,
        record_version: typeof props.modelValue?.record_version === 'number' ? props.modelValue.record_version : 1,
    };

    if (incomingHasChallenges.value || facingChallenges.value.length > 0) {
        payload.facing_challenges = facingChallenges.value.map((c, i) => ({
            row_no: typeof c.row_no === 'number' ? c.row_no : i + 1,
            challenge_text: c.challenge_text ?? null,
        }));
    }

    if (incomingHasProblems.value || identifiedProblems.value.length > 0) {
        payload.identified_problems = identifiedProblems.value.map((p, i) => ({
            row_no: typeof p.row_no === 'number' ? p.row_no : i + 1,
            problem_text: p.problem_text ?? null,
        }));
    }

    if (incomingHasImpacts.value || serviceImpacts.value.length > 0) {
        payload.service_impacts = serviceImpacts.value.map((item) => ({
            impact_code: item.impact_code,
            other_description:
                item.impact_code === 'OTHER'
                    ? item.other_description && item.other_description.trim()
                        ? item.other_description
                        : null
                    : null,
        }));
    }

    emit('update:modelValue', payload);
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
    isDirty.value = true;
    delete errors.value.service_impacts;
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
    isDirty.value = true;
    delete errors.value.other_description;
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
    isDirty.value = true;
    delete errors.value.facing_challenges;
    const nextRowNo = facingChallenges.value.length + 1;
    facingChallenges.value.push({
        row_no: nextRowNo,
        challenge_text: '',
    });
    notifyUpdate();
}

function removeChallenge(index: number) {
    if (props.disabled || props.readonly) return;
    isDirty.value = true;
    facingChallenges.value.splice(index, 1);
    // Re-index row_no to maintain sequential 1..N natural keys
    facingChallenges.value.forEach((row, i) => {
        row.row_no = i + 1;
    });
    notifyUpdate();
}

function addProblem() {
    if (identifiedProblems.value.length >= 3 || props.disabled || props.readonly) return;
    isDirty.value = true;
    delete errors.value.identified_problems;
    const nextRowNo = identifiedProblems.value.length + 1;
    identifiedProblems.value.push({
        row_no: nextRowNo,
        problem_text: '',
    });
    notifyUpdate();
}

function removeProblem(index: number) {
    if (props.disabled || props.readonly) return;
    isDirty.value = true;
    identifiedProblems.value.splice(index, 1);
    // Re-index row_no
    identifiedProblems.value.forEach((row, i) => {
        row.row_no = i + 1;
    });
    notifyUpdate();
}

function onPurposeInput() {
    isDirty.value = true;
    delete errors.value.maintenance_purpose;
    notifyUpdate();
}

function onChallengeInput() {
    isDirty.value = true;
    delete errors.value.facing_challenges;
    notifyUpdate();
}

function onProblemInput() {
    isDirty.value = true;
    delete errors.value.identified_problems;
    notifyUpdate();
}

// Validation logic for Submit Action
function validateSubmit(): boolean {
    const newErrors: Record<string, string> = {};

    // F-24-4: Gate submit for readonly or disabled (fail closed)
    if (props.readonly || props.disabled) {
        newErrors.form = 'Form is readonly or disabled';
        errors.value = newErrors;
        emit('validate', newErrors);
        return false;
    }

    // F-24-1: Subtype matrix validation (fail closed for unrecognized subtype)
    if (!normalizedSubtype.value) {
        newErrors.subtype = `Unrecognized subtype: ${String(props.subtype)}`;
        errors.value = newErrors;
        emit('validate', newErrors);
        return false;
    }

    // F-24-2: Check for invalid impact codes from incoming data
    if (invalidImpactCodes.value.length > 0) {
        newErrors.service_impacts = `Invalid impact_code: ${invalidImpactCodes.value.join(', ')}`;
    }

    // F-24-8: Check for duplicate natural keys in service_impacts
    const seenImpacts = new Set<string>();
    for (const item of serviceImpacts.value) {
        if (seenImpacts.has(item.impact_code)) {
            newErrors.service_impacts = `Duplicate impact_code found: ${item.impact_code}`;
            break;
        }
        seenImpacts.add(item.impact_code);
    }

    // F-24-8: Check for duplicate natural keys in challenges/problems
    const seenChallenges = new Set<number>();
    for (const c of facingChallenges.value) {
        if (seenChallenges.has(c.row_no)) {
            newErrors.facing_challenges = `Duplicate row_no found: ${c.row_no}`;
            break;
        }
        seenChallenges.add(c.row_no);
    }

    const seenProblems = new Set<number>();
    for (const p of identifiedProblems.value) {
        if (seenProblems.has(p.row_no)) {
            newErrors.identified_problems = `Duplicate row_no found: ${p.row_no}`;
            break;
        }
        seenProblems.add(p.row_no);
    }

    // AC1: Purpose Subtype Matrix
    if (normalizedSubtype.value === 'Maintenance') {
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
    if (normalizedSubtype.value === 'Upgrade' || normalizedSubtype.value === 'Emergency') {
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
    if (serviceImpacts.value.length === 0 && !newErrors.service_impacts) {
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

// Method to get wire draft payload using buildDraftPayload helper from draftPayload.ts (F-24-10)
function getDraftPayload(): ChangeDraftWirePayload['change'] {
    const changeData: Record<string, unknown> = {
        maintenance_purpose: maintenancePurpose.value.trim() ? maintenancePurpose.value : null,
    };

    if (incomingHasChallenges.value || facingChallenges.value.length > 0) {
        changeData.facing_challenges = facingChallenges.value.slice(0, 3).map((c, i) => ({
            row_no: typeof c.row_no === 'number' && c.row_no >= 1 && c.row_no <= 3 ? c.row_no : i + 1,
            challenge_text: c.challenge_text ?? null,
        }));
    }

    if (incomingHasProblems.value || identifiedProblems.value.length > 0) {
        changeData.identified_problems = identifiedProblems.value.slice(0, 3).map((p, i) => ({
            row_no: typeof p.row_no === 'number' && p.row_no >= 1 && p.row_no <= 3 ? p.row_no : i + 1,
            problem_text: p.problem_text ?? null,
        }));
    }

    if (incomingHasImpacts.value || serviceImpacts.value.length > 0) {
        changeData.service_impacts = serviceImpacts.value.map((item) => ({
            impact_code: item.impact_code,
            other_description:
                item.impact_code === 'OTHER'
                    ? item.other_description?.trim()
                        ? item.other_description
                        : null
                    : null,
        }));
    }

    const payload = buildDraftPayload({
        family: 'CHANGE',
        record_version:
            typeof props.modelValue?.record_version === 'number' && props.modelValue.record_version >= 1
                ? props.modelValue.record_version
                : 1,
        change: changeData,
    });
    return payload.change;
}

function resetDirty() {
    isDirty.value = false;
}

defineExpose({
    validateSubmit,
    getDraftPayload,
    errors,
    isDirty,
    resetDirty,
    toggleImpact,
    addChallenge,
    removeChallenge,
    addProblem,
    removeProblem,
    updateOtherDescription,
    facingChallenges,
    identifiedProblems,
    serviceImpacts,
});
</script>

<template>
    <div class="purpose-impact-section space-y-6">
        <!-- Subtype Notice / Header -->
        <div class="section-header flex items-center justify-between pb-2 border-b">
            <div>
                <h3 class="text-lg font-semibold text-foreground">Change Purpose, Problems & Service Impacts</h3>
                <p class="text-sm text-muted-foreground">
                    Subtype: <span class="font-medium text-foreground">{{ subtype }}</span>
                </p>
            </div>
            <!-- Test trigger button for submit validation (F-24-4) -->
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
        </div>

        <!-- Maintenance Purpose Field (Required for Maintenance, optional for Upgrade/Emergency) -->
        <div class="form-group space-y-1.5" data-testid="maintenance-purpose-group">
            <label for="maintenance-purpose-input" class="text-sm font-medium text-foreground flex items-center">
                Maintenance Purpose
                <span
                    v-if="normalizedSubtype === 'Maintenance'"
                    class="text-destructive font-bold ml-1"
                    data-testid="purpose-required-asterisk"
                    >*</span
                >
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
                @input="onPurposeInput"
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
                        <span
                            v-if="normalizedSubtype === 'Upgrade' || normalizedSubtype === 'Emergency'"
                            class="text-destructive font-bold ml-1"
                            data-testid="challenges-required-asterisk"
                            >*</span
                        >
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

            <div
                v-for="(challenge, index) in facingChallenges"
                :key="challenge.row_no || index"
                class="flex items-start gap-2"
            >
                <span class="text-xs font-semibold text-muted-foreground pt-2.5 w-6 text-center"
                    >#{{ challenge.row_no }}</span
                >
                <div class="flex-1">
                    <input
                        type="text"
                        :data-testid="`challenge-input-${index}`"
                        v-model="challenge.challenge_text"
                        :disabled="disabled || readonly"
                        maxlength="1000"
                        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Describe facing challenge..."
                        @input="onChallengeInput"
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

            <div
                v-for="(problem, index) in identifiedProblems"
                :key="problem.row_no || index"
                class="flex items-start gap-2"
            >
                <span class="text-xs font-semibold text-muted-foreground pt-2.5 w-6 text-center"
                    >#{{ problem.row_no }}</span
                >
                <div class="flex-1">
                    <input
                        type="text"
                        :data-testid="`problem-input-${index}`"
                        v-model="problem.problem_text"
                        :disabled="disabled || readonly"
                        maxlength="1000"
                        class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Describe identified problem..."
                        @input="onProblemInput"
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
                    <span class="text-xs text-muted-foreground ml-2"
                        >(Multiselect; Team does NOT filter impact options)</span
                    >
                </label>
            </div>

            <p v-if="errors.service_impacts" class="text-xs font-medium text-destructive" role="alert">
                {{ errors.service_impacts }}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div v-for="impactCode in IMPACT_OPTIONS" :key="impactCode" class="flex items-center space-x-2">
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

