import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ResourceTable, { type ColumnDef, type TablePaginationMeta, type TableQuery } from './ResourceTable.vue';

const sampleColumns: ColumnDef[] = [
    { key: 'request_no', label: 'Nomor Permintaan', sortable: true },
    { key: 'title', label: 'Judul', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
];

describe('ResourceTable.vue', () => {
    describe('AC1: table_renders_empty_vs_failure', () => {
        it('renders empty state when items is empty and no error: hasil 0 bukan error', () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    loading: false,
                    error: null,
                    emptyText: 'Belum ada data tersedia',
                },
            });

            expect(wrapper.find('[data-testid="table-empty-state"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-empty-state"]').text()).toContain('Belum ada data tersedia');
            expect(wrapper.find('[data-testid="table-error-state"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('Terjadi kesalahan');
        });

        it('renders failure state when error is provided: failure bukan "tidak ada data"', () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    loading: false,
                    error: 'Gagal menghubungi server (500)',
                    emptyText: 'No data',
                },
            });

            expect(wrapper.find('[data-testid="table-error-state"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-error-state"]').text()).toContain(
                'Gagal menghubungi server (500)',
            );
            expect(wrapper.find('[data-testid="table-empty-state"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('No data');
        });
    });

    describe('AC2: table_emits_canonical_query', () => {
        it('resets page to 1 when search or filter changes', async () => {
            const currentQuery: TableQuery = {
                page: 4,
                per_page: 25,
                q: 'lama',
            };

            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: currentQuery,
                },
            });

            const searchInput = wrapper.find('[data-testid="table-search-input"]');
            expect(searchInput.exists()).toBe(true);

            await searchInput.setValue('baru');
            await searchInput.trigger('input');

            const emitted = wrapper.emitted('update:query');
            expect(emitted).toBeTruthy();
            const latestQuery = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
            expect(latestQuery.q).toBe('baru');
            expect(latestQuery.page).toBe(1);
        });

        it('emits the chosen page size and returns to the first page', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 3, per_page: 25 } satisfies TableQuery,
                },
            });

            await wrapper.get('[data-testid="table-per-page-select"]').setValue('50');

            const emitted = wrapper.emitted('update:query');
            const latestQuery = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
            expect(latestQuery.per_page).toBe(50);
            expect(latestQuery.page).toBe(1);
        });

        it('clamps or rejects per_page > 100 so per_page 101 tidak dikirim', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 2, per_page: 101 } satisfies TableQuery,
                },
            });

            await wrapper.get('[data-testid="table-search-input"]').setValue('demo');

            const emitted = wrapper.emitted('update:query');
            const latestQuery = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
            expect(latestQuery.per_page).toBe(100);
        });

        it('rejects unknown sort field not in whitelist: sort tak dikenal ditolak', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 1, per_page: 25 },
                    sortWhitelist: ['request_no'],
                },
            });

            await wrapper.get('[data-testid="sort-button-title"]').trigger('click');
            expect(wrapper.emitted('update:query')).toBeUndefined();

            await wrapper.get('[data-testid="sort-button-request_no"]').trigger('click');
            const emitted = wrapper.emitted('update:query');
            expect((emitted?.[0]?.[0] as TableQuery).sort).toBe('request_no');
        });
    });

    describe('AC3: table_keeps_latest_search_response', () => {
        it('stale response does not overwrite latest query result', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [{ id: 1, request_no: 'REQ-01', title: 'Hasil Awal', status: 'DRAFT' }],
                    requestId: 2,
                },
            });

            expect(wrapper.text()).toContain('Hasil Awal');

            await wrapper.setProps({
                items: [{ id: 99, request_no: 'REQ-OLD', title: 'Hasil Lawas Yang Terlambat', status: 'DRAFT' }],
                requestId: 1,
            });

            expect(wrapper.text()).not.toContain('Hasil Lawas Yang Terlambat');
            expect(wrapper.text()).toContain('Hasil Awal');

            await wrapper.setProps({
                items: [{ id: 2, request_no: 'REQ-NEW', title: 'Hasil Terkini', status: 'DRAFT' }],
                requestId: 3,
            });

            expect(wrapper.text()).toContain('Hasil Terkini');
            expect(wrapper.text()).not.toContain('Hasil Awal');
        });
    });

    describe('AC4: table_exposes_sort_and_pagination', () => {
        it('sets correct aria-sort attributes on sortable column headers', () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [{ id: 1, request_no: 'REQ-01', title: 'Permintaan 1', status: 'DRAFT' }],
                    query: { page: 1, per_page: 25, sort: 'request_no', direction: 'asc' },
                    sortWhitelist: ['request_no', 'title'],
                },
            });

            const reqNoHeader = wrapper.find('[data-testid="header-request_no"]');
            expect(reqNoHeader.attributes('aria-sort')).toBe('ascending');

            const titleHeader = wrapper.find('[data-testid="header-title"]');
            expect(titleHeader.attributes('aria-sort')).toBe('none');

            const statusHeader = wrapper.find('[data-testid="header-status"]');
            expect(statusHeader.attributes('aria-sort')).toBeUndefined();
        });

        it('disables prev/next buttons on page boundary limits', async () => {
            const meta: TablePaginationMeta = {
                current_page: 1,
                per_page: 25,
                total: 50,
                last_page: 2,
            };

            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [{ id: 1, request_no: 'REQ-01', title: 'Item 1', status: 'DRAFT' }],
                    query: { page: 1, per_page: 25 },
                    meta,
                },
            });

            const prevBtn = wrapper.find('[data-testid="pagination-prev"]');
            const nextBtn = wrapper.find('[data-testid="pagination-next"]');

            expect(prevBtn.attributes('disabled')).toBeDefined();
            expect(nextBtn.attributes('disabled')).toBeUndefined();

            await wrapper.setProps({
                query: { page: 2, per_page: 25 },
                meta: { ...meta, current_page: 2 },
            });

            expect(prevBtn.attributes('disabled')).toBeUndefined();
            expect(nextBtn.attributes('disabled')).toBeDefined();
        });

        it('ensures keyboard focusability and action access', () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [{ id: 1, request_no: 'REQ-01', title: 'Item 1', status: 'DRAFT' }],
                    sortWhitelist: ['request_no', 'title'],
                },
            });

            const sortButton = wrapper.find('[data-testid="sort-button-request_no"]');
            expect(sortButton.exists()).toBe(true);
            expect(sortButton.element.tagName.toLowerCase()).toBe('button');
            expect(sortButton.attributes('tabindex') ?? '0').not.toBe('-1');
        });
    });
});

describe('Additional edge cases for ResourceTable coverage', () => {
    it('renders slot content for custom cells and supports pagination click', async () => {
        const meta: TablePaginationMeta = {
            current_page: 2,
            per_page: 25,
            total: 75,
            last_page: 3,
            from: 26,
            to: 50,
        };

        const wrapper = mount(ResourceTable, {
            props: {
                columns: sampleColumns,
                items: [{ id: 1, request_no: 'REQ-01', title: 'Permintaan 1', status: 'DRAFT' }],
                query: { page: 2, per_page: 25, sort: 'request_no', direction: 'desc' },
                meta,
            },
            slots: {
                'cell-status': '<span class="custom-status">Custom Status Badge</span>',
            },
        });

        expect(wrapper.find('.custom-status').text()).toBe('Custom Status Badge');
        expect(wrapper.text()).toContain('Page 2 of 3 (75 total)');

        const prevBtn = wrapper.find('[data-testid="pagination-prev"]');
        await prevBtn.trigger('click');

        const emitted = wrapper.emitted('update:query');
        expect(emitted).toBeTruthy();
        const latestQuery = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
        expect(latestQuery.page).toBe(1);

        const nextBtn = wrapper.find('[data-testid="pagination-next"]');
        await nextBtn.trigger('click');
        const latestQueryNext = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
        expect(latestQueryNext.page).toBe(3);
    });

    it('shows loading state overlay when loading is true', () => {
        const wrapper = mount(ResourceTable, {
            props: {
                columns: sampleColumns,
                items: [],
                loading: true,
            },
        });

        expect(wrapper.find('[data-testid="table-loading-state"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="table-loading-state"]').text()).toContain('Loading…');
    });

    it('toggles sort direction when clicking the same sortable column', async () => {
        const wrapper = mount(ResourceTable, {
            props: {
                columns: sampleColumns,
                items: [{ id: 1, request_no: 'REQ-01', title: 'Permintaan 1', status: 'DRAFT' }],
                query: { page: 1, per_page: 25, sort: 'request_no', direction: 'asc' },
                sortWhitelist: ['request_no', 'title'],
            },
        });

        const sortButton = wrapper.find('[data-testid="sort-button-request_no"]');
        await sortButton.trigger('click');

        const emitted = wrapper.emitted('update:query');
        expect(emitted).toBeTruthy();
        const latestQuery = (emitted && emitted[emitted.length - 1]?.[0]) as TableQuery;
        expect(latestQuery.sort).toBe('request_no');
        expect(latestQuery.direction).toBe('desc');
    });
});

describe('ResourceTable copy', () => {
    it('renders English labels for search, paging and the default empty state', () => {
        const wrapper = mount(ResourceTable, {
            props: { columns: [{ key: 'name', label: 'Name' }], items: [] },
        });

        expect(wrapper.find('[data-testid="table-empty-state"]').text()).toBe('No data');
        expect(wrapper.find('[data-testid="table-search-input"]').attributes('placeholder')).toBe('Search…');
        expect(wrapper.find('[data-testid="pagination-prev"]').text()).toBe('Previous');
        expect(wrapper.find('[data-testid="pagination-next"]').text()).toBe('Next');
        expect(wrapper.text()).toContain('Per page');
    });

    describe('response ordering, rendering and pagination fallbacks', () => {
        it('AC3: accepts the first response, keeps the newest one and ignores an older id', async () => {
            const wrapper = mount(ResourceTable, {
                props: { columns: sampleColumns, items: [{ request_no: 'first' }], requestId: 1 },
            });
            expect(wrapper.text()).toContain('first');

            await wrapper.setProps({ items: [{ request_no: 'second' }], requestId: 2 });
            expect(wrapper.text()).toContain('second');

            await wrapper.setProps({ items: [{ request_no: 'late first' }], requestId: 1 });
            expect(wrapper.text()).toContain('second');
            expect(wrapper.text()).not.toContain('late first');
        });

        it('AC3: orders non-numeric request ids on their own, and starts accepting once one arrives', async () => {
            const wrapper = mount(ResourceTable, {
                props: { columns: sampleColumns, items: [{ request_no: 'no id yet' }] },
            });
            expect(wrapper.text()).toContain('no id yet');

            await wrapper.setProps({ items: [{ request_no: 'search-b' }], requestId: 'b' });
            expect(wrapper.text()).toContain('search-b');

            await wrapper.setProps({ items: [{ request_no: 'search-a' }], requestId: 'a' });
            expect(wrapper.text()).toContain('search-b');

            await wrapper.setProps({ items: [{ request_no: 'search-c' }], requestId: 'c' });
            expect(wrapper.text()).toContain('search-c');
        });

        it('renders an actions column only when the caller provides one', () => {
            const withoutActions = mount(ResourceTable, {
                props: { columns: sampleColumns, items: [{ id: 'row-1', request_no: 'DEMO-ACT-001' }] },
            });
            expect(withoutActions.text()).not.toContain('Actions');

            const withActions = mount(ResourceTable, {
                props: { columns: sampleColumns, items: [{ request_no: 'DEMO-ACT-001' }] },
                slots: { actions: '<button data-testid="row-action">Open</button>' },
            });
            expect(withActions.get('th:last-of-type').text()).toBe('Actions');
            expect(withActions.find('[data-testid="row-action"]').exists()).toBe(true);
        });

        it('falls back to the first page and an empty count when the server sent no pagination meta', () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 1, per_page: undefined as unknown as number },
                },
            });

            expect(wrapper.text()).toContain('Page 1 of 1 (0 total)');
            expect(wrapper.get('[data-testid="pagination-prev"]').attributes('disabled')).toBeDefined();
            expect(wrapper.get('[data-testid="pagination-next"]').attributes('disabled')).toBeDefined();
            expect(wrapper.get<HTMLSelectElement>('[data-testid="table-per-page-select"]').element.value).toBe('25');
        });

        it('sends the page size the contract allows when the query carries none', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 1, per_page: undefined as unknown as number },
                },
            });

            await wrapper.get('[data-testid="table-search-input"]').setValue('demo');

            const emitted = wrapper.emitted('update:query');
            expect((emitted?.[emitted.length - 1]?.[0] as TableQuery).per_page).toBe(25);
        });

        it('cycles the sort direction back to ascending on the third click', async () => {
            const wrapper = mount(ResourceTable, {
                props: {
                    columns: sampleColumns,
                    items: [],
                    query: { page: 1, per_page: 25, sort: 'request_no', direction: 'desc' },
                },
            });

            await wrapper.get('[data-testid="sort-button-request_no"]').trigger('click');

            const emitted = wrapper.emitted('update:query');
            expect((emitted?.[0]?.[0] as TableQuery).direction).toBe('asc');
        });
    });
});
