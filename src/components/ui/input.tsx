import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's input, restyled to the design system.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - `h-9` → `min-h-11`. 36px is under the 44px hit-area floor.
 *   - `rounded-md` → `rounded-xs`. 0.25rem is the input radius; 0.4rem is buttons.
 *   - `shadow-xs` dropped, and `dark:bg-input/30` with it. Elevation is the bg
 *     ladder and the app is dark-only.
 *   - `bg-transparent` → `bg-raised`. The field sits on the hero's grid backdrop,
 *     and a transparent input over a repeating grid reads as broken rather than
 *     minimal.
 *   - `ring-[3px]` → the kit's inverted focus fill, matching button.tsx.
 *   - `md:text-sm` dropped, so the field stays 16px everywhere. Below 16px iOS
 *     Safari zooms the viewport on focus, which is a worse bug than a slightly
 *     large field on a laptop — and mobile is a requirement here, not a polish pass.
 *   - The `file:` variants removed. There is no file input in this product.
 *   - `aria-invalid` no longer turns the border red. `signal` is the Leave control
 *     and your own muted state only; an invalid code is neither. It raises the
 *     border to a stronger neutral instead, and the message beside it carries the
 *     meaning.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-line/60 bg-raised text-ink min-h-11 w-full min-w-0 rounded-xs border px-3 py-2 text-base outline-none',
        'placeholder:text-faint selection:bg-primary selection:text-primary-foreground',
        'transition-colors duration-(--duration-base) ease-in-out',
        'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-ink-2',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
