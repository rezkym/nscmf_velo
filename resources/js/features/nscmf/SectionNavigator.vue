<script setup lang="ts">
import { ref, watch } from 'vue';

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
        <p class="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</p>
        <ul class="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
            <li v-for="section in sections" :key="section.id" class="shrink-0">
                <a
                    :href="`#${section.id}`"
                    class="block whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:whitespace-normal"
                    >{{ section.label }}</a
                >
            </li>
        </ul>
    </nav>
</template>
