import { cva, type VariantProps } from 'class-variance-authority';

/** Shared button look, also usable on Inertia `<Link>` elements that should look like buttons. */
export const buttonVariants = cva(
    [
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
        // A press gives tactile feedback; reduced motion keeps the colour change only.
        'transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-96 motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
    ],
    {
        variants: {
            variant: {
                primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                secondary: 'border border-input bg-card text-heading hover:bg-muted',
                destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
                ghost: 'text-muted-foreground hover:bg-muted hover:text-heading',
            },
            size: {
                sm: 'h-9 px-3 text-sm',
                md: 'h-10 px-4 text-sm',
            },
        },
        defaultVariants: { variant: 'primary', size: 'md' },
    },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
