<script setup lang="ts">
import { ref } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';
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
            <PageHeader
                title="Technical log cleanup"
                description="How long application technical logs are kept. Business, access and security audits are never deleted by this setting."
            />
            <Card>
                <CardContent>
                    <form class="grid gap-5" @submit.prevent="save">
                        <Field orientation="horizontal">
                            <Checkbox id="settings-enabled" v-model="enabled" data-testid="settings-enabled" />
                            <FieldLabel for="settings-enabled">Delete technical logs automatically</FieldLabel>
                        </Field>
                        <div class="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel for="settings-value">Keep logs for</FieldLabel>
                                <Input
                                    id="settings-value"
                                    v-model="value"
                                    type="text"
                                    inputmode="numeric"
                                    data-testid="settings-value"
                                    :aria-invalid="problem !== null"
                                />
                            </Field>
                            <Field>
                                <FieldLabel for="settings-unit">Unit</FieldLabel>
                                <NativeSelect
                                    id="settings-unit"
                                    v-model="unit"
                                    class="w-full"
                                    data-testid="settings-unit"
                                >
                                    <option value="DAY">Days</option>
                                    <option value="MONTH">Calendar months</option>
                                </NativeSelect>
                            </Field>
                        </div>
                        <p v-if="!enabled" class="text-muted-foreground">
                            Cleanup is off: technical logs keep growing until it is turned on again. The period above is
                            kept.
                        </p>
                        <p v-if="problem" role="alert" class="text-destructive">{{ problem }}</p>
                        <div>
                            <Button type="button" data-testid="settings-save" :disabled="saving" @click="save">
                                {{ saving ? 'Saving…' : 'Save' }}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <Alert v-if="notice">
                <AlertTitle>Technical log cleanup</AlertTitle>
                <AlertDescription>{{ notice }}</AlertDescription>
            </Alert>
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
