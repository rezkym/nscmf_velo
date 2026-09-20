import { nextTick, onBeforeUnmount, type Ref, watch } from 'vue';

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface FocusTrapOptions {
    onEscape: () => void;
    /** Element to focus on open. Defaults to the first focusable element in the panel. */
    initialFocus?: Ref<HTMLElement | null>;
    /** Element to focus on close. Defaults to whatever had focus when the dialog opened. */
    returnFocusTo?: () => HTMLElement | null | undefined;
}

/**
 * Keeps keyboard focus inside `panel` while `isOpen` is true, closes on Escape,
 * and returns focus to the triggering element when the dialog closes.
 */
export function useFocusTrap(panel: Ref<HTMLElement | null>, isOpen: () => boolean, options: FocusTrapOptions): void {
    let opener: HTMLElement | null = null;

    function focusableElements(): HTMLElement[] {
        return Array.from(panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    }

    function wrapFocus(event: KeyboardEvent): void {
        const focusable = focusableElements();
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        const active = document.activeElement;
        const focusOutside = !panel.value?.contains(active);

        if (event.shiftKey && (active === first || focusOutside)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (active === last || focusOutside)) {
            event.preventDefault();
            first.focus();
        }
    }

    function onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            options.onEscape();
        } else if (event.key === 'Tab') {
            wrapFocus(event);
        }
    }

    watch(
        isOpen,
        (open) => {
            if (open) {
                opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                window.addEventListener('keydown', onKeydown);
                void nextTick(() => (options.initialFocus?.value ?? focusableElements()[0])?.focus());
            } else {
                window.removeEventListener('keydown', onKeydown);
                (options.returnFocusTo ? options.returnFocusTo() : opener)?.focus();
                opener = null;
            }
        },
        { immediate: true },
    );

    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}
