<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { PanelLeftIcon } from '@lucide/vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from './utils';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

// NSCMF: the trigger reports whether the sidebar is shown, as a disclosure button should.
const { toggleSidebar, isMobile, open, openMobile } = useSidebar();
</script>

<template>
    <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        :class="cn('', props.class)"
        :aria-expanded="isMobile ? openMobile : open"
        @click="toggleSidebar"
    >
        <PanelLeftIcon class="cn-rtl-flip" />
        <span class="sr-only">Toggle Sidebar</span>
    </Button>
</template>
