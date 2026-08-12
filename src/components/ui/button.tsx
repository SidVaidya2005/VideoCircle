import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's button, restyled to the design system. Radix behaviour is untouched —
 * that is why the component is here. What changed from the generated source, and
 * why (see build-journal.md so a later `shadcn add` does not silently revert it):
 *
 *   - Every `dark:` variant removed. The app is dark-only; the tokens are the theme.
 *   - `shadow-xs` dropped from `outline`. Elevation is the bg ladder, never a shadow.
 *   - `rounded-md` → `rounded-sm`. 0.4rem is the button radius; 0.6rem is for chip toggles.
 *   - `font-medium` → `font-normal`. Only Regular and Bold are loaded, so 500 would synthesize.
 *   - `ring-[3px]` → `ring-2`, and focus now reuses the kit's inverted fill.
 *   - `text-white` → `text-ink`. A Tailwind default colour is not a brand token.
 *   - Hover is asymmetric — snaps on, relaxes off — per Design/README.md.
 *   - `xs` and `icon-xs` removed: at 24px they cannot clear the 44px hit-area floor.
 *     Every remaining size does.
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-sm text-sm font-normal outline-none',
    // Asymmetric hover: 50ms in, 250ms out. The kit ships no 50ms token, so the
    // in-duration is written literally; the out-duration uses --duration-base.
    'transition-colors duration-(--duration-base) ease-in-out',
    'hover:duration-[50ms] hover:ease-out',
    // Keyboard focus reuses the inverted fill, ringed so it reads on a white button too.
    'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // The engaged/primary state is a white fill with a dark glyph — never red.
        default: 'bg-primary text-primary-foreground hover:bg-active-hover',
        // Red is destructive only. This is the Leave control's variant.
        destructive: 'bg-destructive text-ink hover:bg-destructive/90',
        outline: 'border-line/60 bg-background hover:bg-accent hover:text-accent-foreground border',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-lifted',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-ink underline-offset-4 hover:underline',
      },
      // Every size clears the 44x44px minimum hit area. A bar that fits by
      // compressing its buttons has not been made responsive.
      size: {
        default: 'h-11 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-11 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-12 px-6 has-[>svg]:px-4',
        icon: 'size-11',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
