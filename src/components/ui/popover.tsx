'use client';

import { Popover as PopoverPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's popover, restyled to the design system and trimmed. Radix behaviour —
 * collision-aware positioning, focus management, escape and outside-press
 * dismissal — is untouched, which is the reason the component is here.
 *
 * A popover rather than the installed `dropdown-menu`: the reactions row is a row
 * of chips, and `DropdownMenuItem` is a full-width command row. Forcing chips into
 * a menu would fight the primitive and lose its keyboard semantics on the way.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - `PopoverAnchor`, `PopoverHeader`, `PopoverTitle` and `PopoverDescription`
 *     removed. Nothing uses them, and the same trimming was applied to
 *     `dropdown-menu` at F04 and `sheet` at F14.
 *   - `shadow-md` dropped. Elevation is the bg ladder — Content sits on
 *     `bg-popover`, which is aliased to bg-4.
 *   - `rounded-md` → `rounded-lg`. 1rem is the panel radius; 0.6rem is for
 *     chip-style toggles.
 *   - `border` → `border-line/60`. Borders are whispers.
 *   - `w-72` dropped: the reactions row sizes to its content, and a fixed width
 *     would leave a gap beside five chips.
 *   - The `animate-in` / `fade-in-0` / `zoom-in-95` classes were dead: they come
 *     from `tw-animate-css`, which this project does not import. Replaced with the
 *     brand's own `--animate-menu-in`, as `dropdown-menu` and `tooltip` use.
 */

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground border-line/60 animate-menu-in z-50 rounded-lg border p-3 outline-hidden',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
