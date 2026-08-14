import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's textarea, restyled to the design system.
 *
 * The corrections are `input.tsx`'s, for the same reasons — read that file for the
 * full reasoning. What is specific to this one (see build-journal.md so a later
 * `shadcn add` does not silently revert any of it):
 *
 *   - `min-h-16` → `min-h-11`. Two rows tall by default is a composer that looks
 *     like it wants an essay; the caller grows it as the message gets longer, and
 *     44px is the hit-area floor either way.
 *   - `field-sizing-content` dropped. It is the CSS answer to auto-growth and the
 *     right one eventually, but Safari does not support it, and this project's
 *     mobile target is real iOS. The caller sizes from `scrollHeight` instead.
 *   - `resize-none`, which the generated source does not set: with the caller
 *     driving the height, a drag handle fights it and leaves the field stuck.
 *   - `shadow-xs`, `ring-[3px]`, `md:text-sm`, both `dark:` variants and the red
 *     `aria-invalid` treatment all go, exactly as in `input.tsx`.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-line/60 bg-raised text-ink min-h-11 w-full min-w-0 resize-none rounded-xs border px-3 py-2 text-base outline-none',
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

export { Textarea };
