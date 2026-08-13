'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's dialog, restyled to the design system and trimmed. Radix behaviour —
 * focus trap, escape and outside-press dismissal, scroll locking, and the modal
 * semantics — is untouched, which is the reason the component is here.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - `DialogFooter`, `DialogOverlay` and `DialogPortal` dropped from the exports.
 *     The footer pulled in `Button` for a Close nothing uses, and the other two are
 *     internals — the same trimming `dropdown-menu`, `sheet` and `popover` had.
 *   - `shadow-lg` dropped from Content. Elevation is the bg ladder; Content sits on
 *     `bg-overlay`, which is bg-4.
 *   - `bg-black/50` overlay → `--scrim-flat`. The kit ships that value as a token
 *     and forbids `backdrop-blur` behind it.
 *   - `border` → `border-line/60`. Borders are whispers.
 *   - The `animate-in` / `fade-in-0` / `zoom-in-95` classes were dead: they come
 *     from `tw-animate-css`, which this project does not import. Replaced with the
 *     brand's own `--animate-menu-in`.
 *   - The close button was a bare 16px icon at 70% opacity. It is now `size-11`
 *     at full strength — a dialog's dismiss is the first thing a thumb reaches
 *     for, and 44px is the floor.
 *   - `text-lg font-semibold` on Title → the brand's wide-tracked CAPS. Only
 *     Regular and Bold are loaded, so 600 would synthesize.
 */

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-[var(--scrim-flat)]"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-overlay border-line/60 animate-menu-in fixed top-1/2 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-4 outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="text-ink focus-visible:ring-active ease-out-quint absolute top-3 right-3 inline-flex size-11 flex-none items-center justify-center rounded-md transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pr-14', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-muted text-xs tracking-wider uppercase', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-ink-2 text-sm leading-normal', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
