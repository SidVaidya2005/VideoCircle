'use client';

import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's sheet, restyled to the design system and trimmed. Radix behaviour —
 * focus trap, escape and outside-press dismissal, scroll locking, and the dialog
 * semantics — is untouched, which is the reason the component is here.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - `SheetFooter` removed. Nothing uses it; the chat composer at F19 is markup
 *     inside Content, not a footer slot.
 *   - `shadow-lg` dropped from Content. Elevation is the bg ladder — Content sits
 *     on `bg-overlay`, which is bg-4.
 *   - `bg-black/50` overlay → `--scrim-flat`. The kit ships that value as a token
 *     and forbids `backdrop-blur` behind it.
 *   - The `animate-in` / `fade-in-0` / `slide-in-from-right` classes were dead:
 *     they come from `tw-animate-css`, which this project does not import.
 *     Replaced with the brand's own `--animate-sheet-in`, exactly as
 *     `dropdown-menu` and `tooltip` use `--animate-menu-in`.
 *   - The close button was a bare 16px icon. It is now `size-11` — a dialog's
 *     dismiss is the control a thumb reaches for first, and 44px is the floor.
 *   - `rounded-xs` → `rounded-md` on that button, matching the call's control
 *     recipe, and its focus ring reuses the kit's inverted fill.
 *   - `font-semibold` → the brand's wide-tracked CAPS on Title. Only Regular and
 *     Bold are loaded, so 600 would synthesize.
 *   - `p-4` on Content → `.sheet-surface`, added at F22. The sheet is pinned to the
 *     right edge and runs the full height, so once `viewport-fit=cover` was set it
 *     began passing under a phone's home indicator with the chat composer as its
 *     last child. The class pays the bottom and right safe-area insets; the
 *     literals live in `globals.css`, where literals belong.
 */

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn('fixed inset-0 z-50 bg-[var(--scrim-flat)]', className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-overlay border-line/60 animate-sheet-in sheet-surface fixed inset-y-0 right-0 z-50 flex h-full w-4/5 max-w-sm flex-col gap-4 border-l',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="Close panel"
          className="text-ink focus-visible:ring-active ease-out-quint absolute top-3 right-3 inline-flex size-11 flex-none items-center justify-center rounded-md transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X aria-hidden="true" className="size-5" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 pr-14', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-muted text-xs tracking-wider uppercase', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-ink-2 text-sm leading-normal', className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger };
