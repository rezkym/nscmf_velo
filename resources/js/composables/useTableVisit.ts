import { router } from '@inertiajs/vue3';
import { computed, ref } from 'vue';

import type { TableQuery } from '@/components/ResourceTable.vue';

type Params = Record<string, string | number | null | undefined>;

/** The server's echo of a list query that has only a name search (12 §13, §80, §88, §93). */
export interface SearchQuery {
    page: number;
    per_page: number;
    q: string | null;
}

/**
 * A server-driven list page: every table change is one GET of `url` with its non-empty params,
 * keeping the page state and scroll; `loading` covers the round trip.
 */
export function useTableVisit(url: string) {
    const loading = ref(false);

    function visit(params: Params): void {
        const sent = Object.fromEntries(
            Object.entries(params).filter(
                (entry): entry is [string, string | number] =>
                    entry[1] !== null && entry[1] !== undefined && entry[1] !== '',
            ),
        );
        router.get(url, sent, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => (loading.value = true),
            onFinish: () => (loading.value = false),
        });
    }

    return { loading, visit };
}

/**
 * A list with only search, rows per page and page navigation, as the administration lists are.
 * Without a query (the setup wizard shows the whole list) the table is not paged.
 */
export function useSearchTable(url: string, query: () => SearchQuery | undefined) {
    const { loading, visit } = useTableVisit(url);
    const paged = computed(() => query() !== undefined);
    const tableQuery = computed(() => {
        const current = query();
        return current && { page: current.page, per_page: current.per_page, q: current.q ?? '' };
    });

    function onQuery(table: TableQuery): void {
        visit({ page: table.page, per_page: table.per_page, q: table.q });
    }

    return { loading, paged, tableQuery, onQuery };
}
