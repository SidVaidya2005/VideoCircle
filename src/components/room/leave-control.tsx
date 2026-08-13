'use client';

import { PhoneOff } from 'lucide-react';
import { useEffect } from 'react';

import { ControlButton } from '@/components/room/control-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** How long the armed state waits before returning to rest. */
const CONFIRM_TIMEOUT_MS = 4_000;

interface LeaveControlProps {
  /** Owned by the bar, because pressing any other control disarms this one. */
  armed: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onLeave: () => void;
}

/**
 * Leave, confirmed in place.
 *
 * A modal over a live call covers the people you are deciding whether to leave,
 * and leaving is recoverable — the same link rejoins. So the control arms itself
 * instead: the first press widens it to ask, the second disconnects.
 *
 * `armed` is the bar's state rather than this component's, because the bar is what
 * knows another control was pressed. An armed Leave must never sit waiting under a
 * thumb that has already moved on to the microphone.
 */
export function LeaveControl({ armed, onArm, onDisarm, onLeave }: LeaveControlProps) {
  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(onDisarm, CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed, onDisarm]);

  if (!armed) {
    return <ControlButton label="Leave the meeting" icon={PhoneOff} tone="leave" onClick={onArm} />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          // The name changes with the state, so a screen reader hears the question
          // rather than the same label twice.
          aria-label="Confirm leaving the meeting"
          onClick={onLeave}
          className={cn(
            'bg-signal text-canvas inline-flex h-11 flex-none items-center justify-center rounded-md px-3',
            'text-xs tracking-wide uppercase',
            'transition-colors duration-(--duration-base) ease-in-out',
            'hover:bg-signal/90 hover:duration-[50ms] hover:ease-out',
            'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
        >
          Leave?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Press again to leave</TooltipContent>
    </Tooltip>
  );
}
