<script setup lang="ts">
import { ref, watch } from 'vue';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The section navigator of a long form (07 §21): one link per form panel, named by the panel's own
 * heading, so the list never drifts from the form it describes.
 */
const props = defineProps<{ form: HTMLElement | null }>();

interface FormSection {
    id: string;
    label: string;
}

const sections = ref<FormSection[]>([]);

function slug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// The form element arrives once the parent has rendered it.
watch(
    () => props.form,
    (form) => {
        const found: FormSection[] = [];

        for (const section of form?.querySelectorAll<HTMLElement>('section') ?? []) {
            const label = section.querySelector('h2')?.textContent?.trim();
            if (!label) continue;
            section.id ||= `section-${slug(label)}`;
            found.push({ id: section.id, label });
        }

        sections.value = found;
    },
    { immediate: true },
);
</script>

<template>
    <nav v-if="sections.length > 0" data-testid="section-navigator" aria-label="Form sections">
        <p class="px-2.5 pb-2 text-xs font-medium text-muted-foreground">Sections</p>
        <ul class="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
            <li v-for="section in sections" :key="section.id" class="shrink-0">
                <a
                    :href="`#${section.id}`"
                    :class="
                        cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'w-full justify-start font-normal text-muted-foreground xl:h-auto xl:whitespace-normal xl:py-1.5',
                        )
                    "
                    >{{ section.label }}</a
                >
            </li>
        </ul>
    </nav>
</template>
