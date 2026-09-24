import { config } from '@vue/test-utils';
import { defineComponent } from 'vue';

/**
 * shadcn-vue overlays (Dialog, Sheet) portal their content to <body>. Rendering the portal in place
 * keeps each test reading one component tree; focus and keyboard behaviour stay real.
 */
const InlinePortal = defineComponent({
    setup(_, { slots }) {
        return () => slots.default?.();
    },
});

config.global.stubs = { ...config.global.stubs, teleport: InlinePortal };
