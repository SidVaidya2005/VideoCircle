'use client';

import { Hand } from 'lucide-react';
import { useState } from 'react';

import { controlVariants } from '@/components/room/control-button';
import { useReactions } from '@/components/room/reactions-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { REACTION_LABELS } from '@/lib/reactions';
import { cn } from '@/lib/utils';

interface ReactionMenuProps {
  /** Pressing anything here disarms an armed Leave, like every other control. */
  onInteract: () => void;
  className?: string;
}

/**
 * The bar's last control: five reaction chips and a raise-hand toggle.
 *
 * Both live behind one control because the bar is full — seven controls at the
 * 44px floor already measure 440px, which does not fit a phone. They are kept
 * visually separate inside because they behave differently: a chip fires and is
 * gone, the toggle persists, and the kit's engaged white belongs to the second.
 */
export function ReactionMenu({ onInteract, className }: ReactionMenuProps) {
  const [open, setOpen] = useState(false);
  const { send, handRaised: raised, toggleHand: toggle } = useReactions();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={raised ? 'Reactions, your hand is raised' : 'Reactions'}
          className={cn(controlVariants({ pressed: open }), className)}
        >
          <Hand aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" align="center">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {REACTION_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onInteract();
                  send(label);
                  setOpen(false);
                }}
                // min-w-11 as well as min-h-11: "+1" is two narrow glyphs, and
                // padding alone leaves it a 41px target. A hit area has two axes.
                className="text-ink focus-visible:ring-active ease-out-quint inline-flex min-h-11 min-w-11 flex-none items-center justify-center rounded-md bg-white/5 px-3 text-xs tracking-wider uppercase transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Separated from the chips: this one persists, and the engaged white
              fill is what says so. */}
          <button
            type="button"
            aria-pressed={raised}
            onClick={() => {
              onInteract();
              toggle();
            }}
            className={cn(
              'ease-out-quint inline-flex min-h-11 w-full flex-none items-center justify-center rounded-md px-3 text-xs tracking-wider uppercase transition-colors duration-150',
              'focus-visible:ring-active focus-visible:ring-2 focus-visible:outline-none',
              raised
                ? 'bg-active text-canvas hover:bg-active-hover'
                : 'text-ink bg-white/5 hover:bg-white/10',
            )}
          >
            {raised ? 'Lower hand' : 'Raise hand'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
