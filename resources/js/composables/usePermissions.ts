import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

import type { SharedAuthProps } from '@/types/auth';

/**
 * Reads the effective permissions shared by the server. This only decides what the UI shows;
 * every action is still authorized by the server.
 */
export function usePermissions() {
    const page = usePage<SharedAuthProps>();
    const permissions = computed(() => page.props.auth?.permissions ?? []);

    function can(permission: string): boolean {
        return permissions.value.includes(permission);
    }

    function canAny(candidates: readonly string[]): boolean {
        return candidates.some(can);
    }

    return { user: computed(() => page.props.auth?.user ?? null), can, canAny };
}
