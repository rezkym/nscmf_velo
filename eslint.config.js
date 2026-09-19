import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
    {
        name: 'nscmf/ignores',
        ignores: [
            'blob-report/**',
            'bootstrap/**',
            'coverage/**',
            'node_modules/**',
            'playwright-report/**',
            'public/**',
            'storage/**',
            'test-results/**',
            'vendor/**',
        ],
    },
    pluginVue.configs['flat/essential'],
    vueTsConfigs.recommendedTypeChecked,
    {
        // Build/test tool configs run in Node and are not part of the browser tsconfig.
        name: 'nscmf/tooling-config-files',
        files: ['*.config.js', '*.config.ts'],
        extends: [vueTsConfigs.disableTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: false,
            },
        },
    },
    {
        // Inertia page components are named after their route, e.g. Welcome or Dashboard.
        name: 'nscmf/inertia-pages',
        files: ['resources/js/Pages/**/*.vue'],
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },
    {
        // shadcn-style UI primitives use single-word names, e.g. Button or Badge.
        name: 'nscmf/ui-primitives',
        files: ['resources/js/components/ui/**/*.vue'],
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },
);
