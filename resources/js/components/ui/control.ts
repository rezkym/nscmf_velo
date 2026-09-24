/** Shared look for text, number, date, textarea and select controls. */
export const controlClass =
    'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50';

/** Shared look for native file pickers: the button part takes the accent surface. */
export const fileInputClass =
    'block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent/70 disabled:cursor-not-allowed disabled:opacity-50';
