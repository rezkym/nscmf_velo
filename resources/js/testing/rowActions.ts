import { flushPromises, type VueWrapper } from '@vue/test-utils';

/**
 * A row's "⋯" actions menu (07 §48). It opens the way a keyboard user opens it, and its items
 * render in the document body, so a test mounts with `attachTo: document.body`.
 */
async function open(wrapper: VueWrapper, rowId: number): Promise<boolean> {
    const trigger = wrapper.find(`[data-testid="row-actions-${rowId}"]`);
    if (!trigger.exists()) return false;
    await trigger.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    return true;
}

/** The test ids of the actions a row's menu offers, in order; none when the row has no menu. */
export async function rowActions(wrapper: VueWrapper, rowId: number): Promise<string[]> {
    if (!(await open(wrapper, rowId))) return [];
    const ids = [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
        item.getAttribute('data-testid'),
    );
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    return ids.filter((id): id is string => id !== null);
}

/** Picks one action from a row's menu. */
export async function chooseRowAction(wrapper: VueWrapper, rowId: number, testId: string): Promise<void> {
    if (!(await open(wrapper, rowId))) throw new Error(`Row ${rowId} has no actions menu`);
    const item = document.body.querySelector<HTMLElement>(`[role="menuitem"][data-testid="${testId}"]`);
    if (!item) throw new Error(`Row ${rowId} offers no ${testId}`);
    item.click();
    await flushPromises();
}
