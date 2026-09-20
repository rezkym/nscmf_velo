<script setup lang="ts">
import { AlertCircle } from '@lucide/vue';
import { computed } from 'vue';

export interface FormFieldProps {
    id: string;
    label?: string;
    help?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
}

const props = withDefaults(defineProps<FormFieldProps>(), {
    label: undefined,
    help: undefined,
    error: undefined,
    required: false,
    disabled: false,
    readonly: false,
});

const helpId = computed(() => (props.help ? `${props.id}-help` : undefined));
const errorId = computed(() => (props.error ? `${props.id}-error` : undefined));

const describedBy = computed(() => {
    const ids = [helpId.value, errorId.value].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : undefined;
});
</script>

<template>
    <div
        class="form-field space-y-1.5"
        :class="{
            'opacity-50 pointer-events-none': disabled,
            'has-error': !!error,
        }"
        :data-invalid="!!error"
    >
        <div v-if="label" class="flex items-center justify-between">
            <label
                :for="id"
                class="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none"
            >
                {{ label }}
                <span v-if="required" data-required class="text-destructive font-bold ml-0.5" aria-hidden="true"
                    >*</span
                >
            </label>
        </div>

        <div class="relative">
            <slot :id="id" :described-by="describedBy" :disabled="disabled" :readonly="readonly" :has-error="!!error" />
        </div>

        <p v-if="help && !error" :id="helpId" class="text-xs text-muted-foreground leading-relaxed">
            {{ help }}
        </p>

        <div
            v-if="error"
            :id="errorId"
            role="alert"
            class="flex items-center gap-1.5 text-xs font-medium text-destructive leading-relaxed"
        >
            <AlertCircle class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{{ error }}</span>
        </div>
    </div>
</template>
