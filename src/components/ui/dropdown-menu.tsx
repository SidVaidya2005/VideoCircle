'use client';

import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn's dropdown menu, restyled to the design system and trimmed. Radix
 * behaviour — focus trapping, typeahead, roving tabindex, escape and outside-click
 * dismissal — is untouched, which is the reason the component is here.
 *
 * What changed from the generated source, and why (see build-journal.md so a later
 * `shadcn add` does not silently revert it):
 *
 *   - Nine sub-components removed: Portal, Group, CheckboxItem, RadioGroup,
 *     RadioItem, Shortcut, Sub, SubTrigger, SubContent. Nothing uses them, and all
 *     three lucide icons were theirs — dropping them keeps `lucide-react` out of
 *     the dependency list until a feature genuinely needs an icon.
 *   - The `destructive` item variant removed. Red is the Leave control and your own
 *     muted state, nothing else; a red menu-item variant is an invitation to break
 *     that. Its `dark:` rule went with it, and the app is dark-only regardless.
 *   - `shadow-md` dropped from Content. Elevation is the bg ladder — Content sits on
 *     `bg-popover`, which is aliased to bg-4.
 *   - `rounded-md` → `rounded-lg` on Content. 1rem is the panel radius.
 *   - Items are `min-h-11`. The generated `py-1.5` gives a ~30px target, under the
 *     44px floor, and a menu is exactly where a thumb lands on a phone.
 *   - Item and Label text is uppercase `text-xs` with `tracking-wide` — the brand's
 *     control-label gesture, per Design/README.md.
 *   - `font-medium` → `font-normal` on Label. Only Regular and Bold are loaded, so
 *     500 would synthesize.
 *   - The `animate-in` / `fade-in-0` / `zoom-in-95` classes were dead: they come
 *     from `tw-animate-css`, which this project does not import. Replaced with the
 *     brand's own `--animate-menu-in`, declared in globals.css.
 *   - `inset` props removed along with the indicator columns they aligned to.
 */

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground border-line/60 z-50 min-w-48 rounded-lg border p-1',
          'max-h-(--radix-dropdown-menu-content-available-height) overflow-x-hidden overflow-y-auto',
          'data-[state=open]:animate-menu-in origin-(--radix-dropdown-menu-content-transform-origin)',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'relative flex min-h-11 cursor-default items-center gap-2 rounded-sm px-3',
        'text-xs tracking-wide uppercase outline-hidden select-none',
        'focus:bg-accent focus:text-accent-foreground',
        // Asymmetric hover, as everywhere else: snaps on, relaxes off.
        'transition-colors duration-(--duration-base) ease-in-out hover:duration-[50ms] hover:ease-out',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn('text-muted px-3 py-2 text-xs font-normal tracking-wide uppercase', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
