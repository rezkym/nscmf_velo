<script setup lang="ts">
import { ref } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import AppLayout from '@/layouts/AppLayout.vue';
import { firstFieldError } from '@/lib/apiErrors';
import { sendJson } from '@/lib/http';

interface TechnicalLogSetting {
    automatic_cleanup_enabled: boolean;
    retention_value: number;
    retention_unit: 'DAY' | 'MONTH';
}

/**
 * Automatic cleanup of technical logs (14 §logs; 12 §110), the one Core Setting. Only the
 * Protected Superadmin may change it, after a fresh password confirmation. Audits are never
 * part of this retention.
 */
const props = defineProps<{ setting: TechnicalLogSetting }>();

const enabled = ref(props.setting.automatic_cleanup_enabled);
const value = ref(String(props.setting.retention_value));
const unit = ref(props.setting.retention_unit);
const saving = ref(false);
const problem = ref<string | null>(null);
const notice = ref<string | null>(null);
const reauthOpen = ref(false);

async function save(): Promise<void> {
    if (saving.value) return;
    notice.value = null;
    problem.value = /^[1-9]\d*$/.test(value.value.trim()) ? null : 'Enter a whole number of 1 or more.';
    if (problem.value) return;

    saving.value = true;
    const result = await sendJson<{ data: TechnicalLogSetting }>('PATCH', '/administration/settings/technical-logs', {
        automatic_cleanup_enabled: enabled.value,
        retention_value: Number(value.value.trim()),
        retention_unit: unit.value,
    });
    saving.value = false;

    if (result.ok) {
        notice.value = 'Setting saved.';
        return;
    }
    const code = result.error?.code;
    if (code === 'REAUTH_REQUIRED' || code === 'REAUTH_FAILED') {
        reauthOpen.value = true;
    } else if (result.status === 403) {
        problem.value = 'Only the Protected Superadmin can change this setting.';
    } else {
        problem.value =
            firstFieldError(result.error, 'retention_value') ??
            firstFieldError(result.error, 'retention_unit') ??
            (result.error?.message || 'The setting could not be saved.');
    }
}

function confirmed(): void {
    reauthOpen.value = false;
    notice.value = 'Identity confirmed. Save again to apply the change.';
}
</script>

<template>
    <AppLayout title="Technical Logs">
        <div class="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Technical log cleanup</h1>
                <p class="text-sm text-muted-foreground">
                    How long application technical logs are kept. Business, access and security audits are never deleted
                    by this setting.
                </p>
            </div>
            <form class="space-y-4 rounded-lg border border-border bg-card p-6" @submit.prevent="save">
                <label class="flex items-center gap-2 text-sm font-medium">
                    <input v-model="enabled" type="checkbox" data-testid="settings-enabled" />
                    Delete technical logs automatically
                </label>
                <div class="grid grid-cols-2 gap-3">
                    <label class="space-y-1 text-sm">
                        <span class="block text-muted-foreground">Keep logs for</span>
                        <input
                            v-model="value"
                            type="text"
                            inputmode="numeric"
                            data-testid="settings-value"
                            :class="controlClass"
                            :aria-invalid="problem !== null"
                        />
                    </label>
                    <label class="space-y-1 text-sm">
                        <span class="block text-muted-foreground">Unit</span>
                        <select v-model="unit" data-testid="settings-unit" :class="controlClass">
                            <option value="DAY">Days</option>
                            <option value="MONTH">Calendar months</option>
                        </select>
                    </label>
                </div>
                <p v-if="!enabled" class="text-sm text-muted-foreground">
                    Cleanup is off: technical logs keep growing until it is turned on again. The period above is kept.
                </p>
                <p v-if="problem" role="alert" class="text-sm text-destructive">{{ problem }}</p>
                <Button type="button" data-testid="settings-save" :disabled="saving" @click="save">
                    {{ saving ? 'Saving…' : 'Save' }}
                </Button>
            </form>
            <Alert v-if="notice" variant="info" title="Technical log cleanup">{{ notice }}</Alert>
        </div>
        <ReauthenticationDialog
            v-if="reauthOpen"
            :open="reauthOpen"
            target-action-title="Confirm setting change"
            target-action-description="Changing the Technical Log cleanup needs your current password."
            error-code="REAUTH_REQUIRED"
            @success="confirmed"
            @cancel="reauthOpen = false"
        />
    </AppLayout>
</template>
