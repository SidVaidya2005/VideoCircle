'use client';

import { MoreVertical, Pin, PinOff } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TileMenuProps {
  /** Named so the menu says whose tile it is — twelve identical menus otherwise. */
  participantLabel: string;
  pinned: boolean;
  onTogglePin: () => void;
}

/**
 * Pin and unpin, reachable without a pointer.
 *
 * The gesture on the tile is a double-click or long-press, which neither a
 * keyboard nor a screen reader can perform. This menu is that path, and it is why
 * the gesture is allowed to stay hidden.
 *
 * Visible on hover or focus where a pointer is fine, and **always visible where
 * hover does not exist** — a control revealed by hover is unreachable on exactly
 * the devices that cannot hover, which is every phone this has to work on.
 */
export function TileMenu({ participantLabel, pinned, onTogglePin }: TileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Options for ${participantLabel}`}
          className={cn(
            // Arbitrary utility because --scrim-flat is a flat semi-opaque fill
            // no colour utility covers. The kit forbids backdrop-blur here.
            'text-ink absolute top-1 right-1 z-10 inline-flex size-11 flex-none items-center justify-center rounded-md bg-[var(--scrim-flat)]',
            'ease-out-quint transition-opacity duration-150',
            'focus-visible:ring-active focus-visible:ring-2 focus-visible:outline-none',
            // Out of the way on a pointer device, always there on a touch one.
            'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
            'data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          <MoreVertical aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onSelect={onTogglePin}>
          {pinned ? (
            <PinOff aria-hidden="true" className="size-4" />
          ) : (
            <Pin aria-hidden="true" className="size-4" />
          )}
          {pinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
