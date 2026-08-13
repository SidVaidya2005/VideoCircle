'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's tooltip, restyled to the design system. Radix behaviour — hover and
 * focus handling, dismissal, and the collision-aware positioning — is untouched,
 * which is the reason the component is here.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - `Arrow` removed entirely. It was the only thing carrying the generated
 *     `rounded-[2px]` and `translate-y-[calc(-50%_-_2px)]`, both arbitrary pixel
 *     values the kit's adherence rule bars, and the brand has no arrow precedent
 *     anywhere — a tooltip is a chip, not a speech bubble.
 *   - `bg-foreground` / `text-background` → `bg-lifted` / `text-ink`. The generated
 *     pair inverts to a white surface, which beside a bar of white *engaged*
 *     controls would read as another engaged control. Elevation is the bg ladder.
 *   - `rounded-md` → `rounded-xs`. 0.25rem is the chip radius; 0.6rem is for
 *     chip-style toggles.
 *   - Text is uppercase with `tracking-wide` — this labels a control, and
 *     wide-tracked CAPS is the brand's control-label gesture.
 *   - The `animate-in` / `fade-in-0` / `zoom-in-95` classes were dead: they come
 *     from `tw-animate-css`, which this project does not import. Replaced with the
 *     brand's own `--animate-menu-in`, exactly as `dropdown-menu` does.
 *   - `delayDuration` 0 → 250. An instant tooltip fires on every pass of the
 *     cursor across a bar of seven controls; 250ms is the kit's base duration.
 */

function TooltipProvider({
  delayDuration = 250,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'bg-lifted text-ink border-line/60 z-50 w-fit rounded-xs border px-2 py-1',
          'animate-menu-in text-xs tracking-wide text-balance uppercase',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
