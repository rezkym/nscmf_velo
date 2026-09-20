<script setup lang="ts">
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import { toNullableNumber } from '@/lib/formInputs';

const value = defineModel<number | null>({ required: true });

defineProps<{
    id: string;
    label: string;
    /** Unit shown next to the control, e.g. "Mbps". */
    suffix?: string;
    help?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}>();

function onInput(event: Event): void {
    value.value = toNullableNumber((event.target as HTMLInputElement).value);
}
</script>

<template>
    <FormField :id="id" :label="label" :help="help" :error="error" :required="required">
        <template #default="{ id: controlId, describedBy }">
            <div class="flex items-center gap-2">
                <input
                    :id="controlId"
                    type="number"
                    inputmode="decimal"
                    :value="value ?? ''"
                    :disabled="disabled"
                    :aria-describedby="describedBy"
                    :class="controlClass"
                    @input="onInput"
                />
                <span v-if="suffix" class="shrink-0 text-sm text-muted-foreground">{{ suffix }}</span>
            </div>
        </template>
    </FormField>
</template>
