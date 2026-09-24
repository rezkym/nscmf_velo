<script setup lang="ts">
import { ref, useId } from 'vue';

import { useFocusTrap } from '@/composables/useFocusTrap';

const props = withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        description?: string;
        /** While busy (e.g. a request is in flight) Escape does not close the modal. */
        busy?: boolean;
        wide?: boolean;
        /** Element to focus after closing. Defaults to whatever had focus when the modal opened. */
        returnFocusTo?: HTMLElement | null;
    }>(),
    { description: undefined, busy: false, wide: false, returnFocusTo: undefined },
);

const emit = defineEmits<{ close: [] }>();

const panel = ref<HTMLElement | null>(null);
const titleId = useId();
const descriptionId = useId();

useFocusTrap(panel, () => props.open, {
    onEscape: () => {
        if (!props.busy) emit('close');
    },
    returnFocusTo: props.returnFocusTo === undefined ? undefined : () => props.returnFocusTo,
});
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4 transition-opacity duration-200 ease-out starting:opacity-0"
    >
        <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="description ? descriptionId : undefined"
            class="panel max-h-[90vh] w-full overflow-y-auto p-6 shadow-xl transition-[opacity,scale] duration-200 ease-out starting:scale-96 starting:opacity-0"
            :class="wide ? 'max-w-2xl' : 'max-w-lg'"
        >
            <div class="mb-4 space-y-1">
                <h2 :id="titleId" class="text-lg font-semibold text-foreground">{{ title }}</h2>
                <p v-if="description" :id="descriptionId" class="text-sm text-muted-foreground">{{ description }}</p>
            </div>

            <slot />

            <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2">
                <slot name="footer" />
            </div>
        </div>
    </div>
</template>
