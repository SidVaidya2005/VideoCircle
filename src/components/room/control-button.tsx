'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The call's control recipe, from `Design/preview/control-states.html`.
 *
 * Lives here rather than in `components/ui` for the same reason the lobby's
 * `DeviceToggle` lives in `components/lobby`: a control recipe belongs with the
 * surface it was drawn for. It knows nothing about meetings or participants.
 */
export const controlVariants = cva(
  [
    // flex-none is load-bearing. Without it these shrink to fit a narrow bar and
    // the 44px floor is breached silently — the bar still "fits" and every target
    // is too small to hit.
    'inline-flex size-11 flex-none items-center justify-center rounded-md',
    // Asymmetric, as everywhere else in the kit: snaps on, relaxes off. CSS only —
    // this sits inside <LiveKitRoom>, where JS animation competes with encoding.
    'transition-colors duration-(--duration-base) ease-in-out',
    'hover:duration-[50ms] hover:ease-out',
    'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    // Press does not shrink; the fill inverts instead, and keyboard focus reuses
    // that same state — so focus and press look identical by design.
    // Disabled outranks every tone by CSS specificity, not by class order: a
    // control that is not available should not also be shouting its state.
    'disabled:cursor-not-allowed disabled:bg-white/3 disabled:text-faint',
    'disabled:hover:bg-white/3 disabled:hover:text-faint',
    '[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        /**
         * Rest. `bg-white/5` is the kit's own idiom for a wash — the same
         * rgba(255,255,255,.05) it uses for --grid-line-major — not a stray
         * Tailwind default. Engaged is handled by `pressed`, not by a tone.
         */
        neutral: 'bg-white/5 text-ink hover:bg-white/10',
        /**
         * Your own microphone, muted. One of exactly two places red appears in a
         * call — the other is Leave. A remote participant's mute is never this.
         */
        warning: 'bg-signal-faint text-signal hover:bg-signal-dim',
        /** The one solid red control in the product. Wider than the squares. */
        leave: 'bg-signal text-canvas hover:bg-signal/90 w-16',
      },
      /** Engaged: white fill, dark glyph. Never red — several can be on at once. */
      pressed: {
        true: 'bg-active text-canvas hover:bg-active-hover',
        false: '',
      },
    },
    defaultVariants: { tone: 'neutral', pressed: false },
  },
);

interface ControlButtonProps extends VariantProps<typeof controlVariants> {
  /** The accessible name, and the tooltip's text. Always states the action. */
  label: string;
  icon: LucideIcon;
  /** Omitted for controls that act rather than toggle, like Leave. */
  toggled?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ControlButton({
  label,
  icon: Icon,
  tone,
  pressed,
  toggled,
  disabled,
  onClick,
  className,
}: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          // aria-pressed only on real toggles. On Leave it would claim a state
          // the control does not have.
          aria-pressed={toggled}
          disabled={disabled}
          onClick={onClick}
          className={cn(controlVariants({ tone, pressed }), className)}
        >
          <Icon aria-hidden="true" />
        </button>
      </TooltipTrigger>
      {/* Pointer affordance only; aria-label is the accessible name for everyone
          else, so this is not the sole carrier of the control's meaning. */}
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
