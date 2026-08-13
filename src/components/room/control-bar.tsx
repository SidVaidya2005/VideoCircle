'use client';

import { useLocalParticipant } from '@livekit/components-react';
import {
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Users,
  Video,
  VideoOff,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { ControlButton, controlVariants } from '@/components/room/control-button';
import { LeaveControl } from '@/components/room/leave-control';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCallShortcuts } from '@/hooks/use-call-shortcuts';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  onLeave: () => void;
}

interface SecondaryControl {
  key: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The controls that collapse into MORE below `sm:`.
 *
 * Declared once and rendered twice — inline on the bar, and as menu items in the
 * dropdown — so the two never drift. Each is disabled until the feature that
 * gives it something to open: participants at F14, reactions and raise hand at
 * F15, chat at F19. Each of those removes one flag and adds one handler.
 *
 * Screen share is deliberately absent rather than disabled. `getDisplayMedia`
 * exists on no mobile browser, so absence already means "your device cannot do
 * this"; adding a second meaning would cost the rule its clarity. F12 adds it
 * behind the capability check.
 */
const SECONDARY_CONTROLS: readonly SecondaryControl[] = [
  { key: 'chat', label: 'Open chat', icon: MessageSquare },
  { key: 'participants', label: 'Show participants', icon: Users },
  { key: 'reactions', label: 'Raise hand', icon: Hand },
];

export function ControlBar({ onLeave }: ControlBarProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  // The bar owns this, not the Leave control: pressing anything else has to
  // disarm it, and only the bar knows that happened.
  const [leaveArmed, setLeaveArmed] = useState(false);

  // Stable identity, so the confirm timeout is not restarted every time a device
  // toggle re-renders the bar.
  const disarmLeave = useCallback(() => setLeaveArmed(false), []);

  function toggleMicrophone() {
    disarmLeave();
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  function toggleCamera() {
    disarmLeave();
    void localParticipant.setCameraEnabled(!isCameraEnabled);
  }

  useCallShortcuts({ onToggleMicrophone: toggleMicrophone, onToggleCamera: toggleCamera });

  return (
    <TooltipProvider>
      <div className="border-line/60 bg-card mx-auto flex w-max max-w-full flex-none items-center gap-2 rounded-lg border px-3 py-2.5">
        <ControlButton
          label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
          icon={isMicrophoneEnabled ? Mic : MicOff}
          // Your own muted microphone is one of exactly two places red appears in
          // a call. The other is Leave.
          tone={isMicrophoneEnabled ? 'neutral' : 'warning'}
          toggled={!isMicrophoneEnabled}
          onClick={toggleMicrophone}
        />
        <ControlButton
          label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          icon={isCameraEnabled ? Video : VideoOff}
          // Neutral, not red: off-camera is not a warning, which is the same call
          // the lobby's DeviceToggle made. The slashed icon carries the state.
          toggled={!isCameraEnabled}
          onClick={toggleCamera}
        />

        {/* Inline from sm: up. Below that the same three live in the menu. */}
        {SECONDARY_CONTROLS.map((control) => (
          <ControlButton
            key={control.key}
            label={control.label}
            icon={control.icon}
            disabled
            className="hidden sm:inline-flex"
          />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* The recipe comes from controlVariants rather than being restated,
                so this cannot drift from the buttons beside it. Not <ControlButton>
                itself: that wraps a tooltip trigger, and stacking two asChild
                triggers on one element is a fight for no gain — the menu is its
                own affordance. */}
            <button
              type="button"
              aria-label="More options"
              className={cn(controlVariants({}), 'sm:hidden')}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            {SECONDARY_CONTROLS.map((control) => (
              <DropdownMenuItem key={control.key} disabled>
                <control.icon aria-hidden="true" className="size-4" />
                {control.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* The specimen's gap before Leave: it is the one control you must never
            hit by accident when reaching for the one beside it. */}
        <span aria-hidden="true" className="w-3 flex-none" />

        <LeaveControl
          armed={leaveArmed}
          onArm={() => setLeaveArmed(true)}
          onDisarm={disarmLeave}
          onLeave={onLeave}
        />
      </div>
    </TooltipProvider>
  );
}
