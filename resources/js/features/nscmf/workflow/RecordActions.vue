<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { ref, watch } from 'vue';

import ActionDialog from '@/components/ActionDialog.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, type ButtonVariants } from '@/components/ui/button';
import { usePermissions } from '@/composables/usePermissions';
import { isRecordConflictCode, pageDomainError } from '@/lib/apiErrors';

/**
 * One confirmed record action (12 §31–42): its own endpoint, permission, reason rule and
 * destination. The server's allowed_actions stays the authority; this only mirrors it.
 */
export interface RecordActionSpec {
    key: string;
    permission: string;
    /** The allowed_actions entry, when it differs from the permission (unarchive). */
    hint?: string;
    label: string;
    path: string;
    consequence: string;
    destination?: string;
    variant?: ButtonVariants['variant'];
    /** reason: mandatory 5..2000; comment: optional; optional-reason: optional `reason` field. */
    input: 'reason' | 'comment' | 'optional-reason';
    payload?: Record<string, string>;
    unavailableReason?: string | null;
}

const props = withDefaults(
    defineProps<{
        recordId: number;
        requestNo: string;
        recordVersion: number;
        allowedActions: string[];
        actions: readonly RecordActionSpec[];
        testidPrefix: string;
        failureMessage?: string;
    }>(),
    { failureMessage: 'The action could not be completed.' },
);

const { can } = usePermissions();
const selected = ref<RecordActionSpec | null>(null);
const trigger = ref<HTMLElement | null>(null);
const actionsRegion = ref<HTMLElement | null>(null);
const pending = ref(false);
const error = ref<string | null>(null);
const conflict = ref(false);
let focusReturnPending = false;

/** The action as currently offered: a dialog opened earlier never outlives a changed offer. */
function current(action: RecordActionSpec): RecordActionSpec | undefined {
    return props.actions.find((offered) => offered.key === action.key);
}

function eligible(action: RecordActionSpec): boolean {
    return (
        current(action) !== undefined &&
        can(action.permission) &&
        props.allowedActions.includes(action.hint ?? action.permission)
    );
}

function available(action: RecordActionSpec): boolean {
    return eligible(action) && !pending.value && !conflict.value && !current(action)?.unavailableReason;
}

const visible = () => props.actions.filter(eligible);

watch(
    () => selected.value !== null && !eligible(selected.value),
    (invalid) => {
        if (invalid && !pending.value) selected.value = null;
    },
);

watch(
    [selected, pending],
    ([action, isPending], [previousAction]) => {
        if (previousAction && !action) focusReturnPending = true;
        if (action || isPending || !focusReturnPending) return;

        focusReturnPending = false;
        const refreshButton = actionsRegion.value?.querySelector<HTMLButtonElement>(
            `[data-testid="${props.testidPrefix}-refresh"]`,
        );
        const target = conflict.value ? refreshButton : trigger.value;
        if (target?.isConnected && !target.hasAttribute('disabled')) {
            target.focus();
        } else {
            actionsRegion.value?.focus();
        }
    },
    { flush: 'post' },
);

function open(action: RecordActionSpec, event: Event): void {
    if (selected.value || !available(action)) return;
    trigger.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    error.value = null;
    selected.value = action;
}

function close(): void {
    if (pending.value) return;
    selected.value = null;
    error.value = null;
}

function markConflict(message: string): void {
    conflict.value = true;
    error.value = message;
    selected.value = null;
}

function showDomainError(domain: { code?: string; message?: string } | null): boolean {
    if (!domain) return false;
    if (isRecordConflictCode(domain.code)) {
        markConflict(domain.message || 'This record changed. Refresh it before another action.');
    } else if (domain.code === 'FORBIDDEN') {
        error.value = 'Access denied. You do not have permission for this action.';
    } else {
        error.value = domain.message || props.failureMessage;
    }
    return true;
}

function body(action: RecordActionSpec, text: string): Record<string, string | number> {
    const trimmed = text.trim();
    const payload: Record<string, string | number> = { record_version: props.recordVersion, ...action.payload };
    if (action.input === 'comment') payload.comment = trimmed;
    else if (action.input === 'reason' || trimmed !== '') payload.reason = trimmed;
    return payload;
}

function submit({ reason }: { reason: string }): void {
    const action = selected.value;
    if (!action || !available(action)) return;

    pending.value = true;
    error.value = null;
    let responseFailed = false;

    router.post(`/nscmf/${props.recordId}/${action.path}`, body(action, reason), {
        onFlash: (flash) => {
            if (showDomainError(pageDomainError(flash))) responseFailed = true;
        },
        onError: (errors) => {
            responseFailed = true;
            error.value = Object.values(errors)[0] || props.failureMessage;
            pending.value = false;
        },
        onSuccess: (page) => {
            if (showDomainError(pageDomainError(page))) responseFailed = true;
            if (!responseFailed) {
                selected.value = null;
                error.value = null;
            }
        },
        onHttpException: (response) => {
            responseFailed = true;
            const data = response.data;
            const code =
                typeof data === 'object' && data !== null && 'code' in data && typeof data.code === 'string'
                    ? data.code
                    : undefined;
            if (response.status === 409 || isRecordConflictCode(code)) {
                markConflict('This record changed. Refresh it before another action.');
            } else if (response.status === 403 || response.status === 401) {
                error.value = 'Access denied. You do not have permission for this action.';
            } else {
                error.value = props.failureMessage;
            }
            pending.value = false;
            return false;
        },
        onNetworkError: () => {
            responseFailed = true;
            error.value = 'Network connection lost. The action was not confirmed.';
            pending.value = false;
            return false;
        },
        onFinish: () => {
            pending.value = false;
        },
    });
}

function refresh(): void {
    if (pending.value) return;
    router.reload({
        onSuccess: () => {
            conflict.value = false;
            error.value = null;
            selected.value = null;
        },
    });
}
</script>

<template>
    <div ref="actionsRegion" :data-testid="`${testidPrefix}-actions`" class="grid gap-3" tabindex="-1">
        <div v-if="visible().length" class="flex flex-wrap gap-2">
            <Button
                type="button"
                v-for="action in visible()"
                :key="action.key"
                :variant="action.variant"
                :data-testid="`${testidPrefix}-${action.key}`"
                :disabled="!available(action)"
                :aria-describedby="action.unavailableReason ? `${testidPrefix}-${action.key}-reason` : undefined"
                @click="open(action, $event)"
            >
                {{ action.label }}
            </Button>
        </div>
        <template v-for="action in visible()" :key="`${action.key}-reason`">
            <p
                v-if="action.unavailableReason"
                :id="`${testidPrefix}-${action.key}-reason`"
                class="text-muted-foreground"
            >
                {{ action.unavailableReason }}
            </p>
        </template>
        <Alert v-if="conflict" variant="destructive">
            <AlertTitle>Record changed</AlertTitle>
            <AlertDescription class="grid justify-items-start gap-2">
                <p>{{ error }}</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :data-testid="`${testidPrefix}-refresh`"
                    @click="refresh"
                >
                    Refresh record
                </Button>
            </AlertDescription>
        </Alert>
        <ActionDialog
            v-if="selected"
            :key="selected.key"
            :open="true"
            :title="selected.label"
            :confirm-label="selected.label"
            :request-no="requestNo"
            :reason-required="selected.input === 'reason'"
            :optional-label="selected.input === 'comment' ? 'Comment' : 'Reason'"
            :consequence="selected.consequence"
            :destination="selected.destination"
            :pending="pending || conflict"
            :error="error ?? undefined"
            :trigger-element="trigger"
            @confirm="submit"
            @cancel="close"
        />
    </div>
</template>
