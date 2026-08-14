'use client';

import { useConnectionState, useLocalParticipant } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import {
  Hand,
  Link as LinkIcon,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  MoreHorizontal,
  Users,
  Video,
  VideoOff,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { ControlButton, controlVariants } from '@/components/room/control-button';
import { InviteDialog } from '@/components/room/invite-dialog';
import { LeaveControl } from '@/components/room/leave-control';
import { ReactionMenu } from '@/components/room/reaction-menu';
import { useReactions } from '@/components/room/reactions-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCallShortcuts } from '@/hooks/use-call-shortcuts';
import { useIsScreenShareSupported } from '@/hooks/use-is-screen-share-supported';
import { readChatKeyFromHash } from '@/lib/crypto/chat-key';
import { env } from '@/lib/env';
import { buildInviteLink } from '@/lib/invite-link';
import { REACTION_LABELS } from '@/lib/reactions';
import { cn } from '@/lib/utils';

export type CallPanelName = 'participants' | 'chat';

interface ControlBarProps {
  onLeave: () => void;
  /** The room code, for the invite link. */
  code: string;
  openPanel: CallPanelName | null;
  onTogglePanel: (panel: CallPanelName) => void;
  /** Everyone in the call, you included. Shown on the participants control. */
  participantCount: number;
  /** Messages that landed while chat was closed. Zero while it is open. */
  unreadChat: number;
}

/**
 * A control that collapses into MORE below `sm:`.
 *
 * Declared once and rendered twice — inline on the bar, and as menu items in the
 * dropdown — so the two never drift.
 *
 * Screen share is deliberately absent rather than disabled. `getDisplayMedia`
 * exists on no mobile browser, so absence already means "your device cannot do
 * this"; adding a second meaning would cost the rule its clarity.
 */
interface SecondaryControl {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Engaged — a white fill, never red. Several controls can be engaged at once. */
  pressed?: boolean;
  /** Rendered as a small count on the control. Participants only, for now. */
  badge?: number;
  /** Screen share only, and only until the room is connected. See below. */
  disabled?: boolean;
}

export function ControlBar({
  onLeave,
  code,
  openPanel,
  onTogglePanel,
  participantCount,
  unreadChat,
}: ControlBarProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  // Capability, not width: absent on every phone, present inside MORE on a narrow
  // desktop window. Absence keeps one meaning — your device cannot do this.
  const screenShareSupported = useIsScreenShareSupported();

  // The bar renders as soon as the room tree mounts, which is one to three
  // seconds before the handshake finishes — and that is exactly when someone who
  // pressed Join reaches for a control. A share started in that window is
  // published into a room that is not there and immediately unpublished, with
  // nothing surfaced at all: the control simply does not change.
  //
  // Only *starting* is gated. Stopping stays available in every state, including
  // a mid-call reconnect, because a share you cannot stop is worse than one you
  // could not start — and the reconnecting case is precisely when someone wants
  // their screen to stop being broadcast.
  const connectionState = useConnectionState();
  const canStartShare = connectionState === ConnectionState.Connected;
  const { send, handRaised: raised, toggleHand } = useReactions();
  // The bar owns this, not the Leave control: pressing anything else has to
  // disarm it, and only the bar knows that happened.
  const [leaveArmed, setLeaveArmed] = useState(false);
  // A modal, not a side panel, so it is deliberately not part of `openPanel` —
  // conflating them would let a panel and a dialog fight for the same state.
  //
  // The link is captured when the dialog opens rather than held from mount: the
  // fragment can change, `window` does not exist during the server render, and a
  // click handler is where the standards put a `window` read.
  const [invite, setInvite] = useState({ open: false, link: '', hasKey: false });

  function openInvite() {
    disarmLeave();
    const hash = window.location.hash;
    setInvite({
      open: true,
      link: buildInviteLink(env.NEXT_PUBLIC_SITE_URL, code, hash),
      // Presence only. The key itself is never read out, logged, or sent.
      hasKey: readChatKeyFromHash(hash) !== null,
    });
  }

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

  async function toggleScreenShare() {
    disarmLeave();
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (error) {
      // NotAllowedError is what every browser throws when the picker is
      // dismissed — by far the common case — and also what Chrome Android 72–88
      // and Firefox Android 66–79 threw despite exposing the method. Cancelling a
      // share is a normal action, so it is neither surfaced nor logged as an
      // error. Nothing was set optimistically, so the bar is already at rest.
      if (error instanceof DOMException && error.name === 'NotAllowedError') return;
      console.warn('[room/control-bar] screen share failed', error);
    }
  }

  useCallShortcuts({ onToggleMicrophone: toggleMicrophone, onToggleCamera: toggleCamera });

  // Screen share leads the secondary group, as in the control-states specimen.
  const secondaryControls: readonly SecondaryControl[] = [
    ...(screenShareSupported
      ? [
          {
            key: 'screen',
            // The disabled label says why, because a control that is simply dim
            // is indistinguishable from one that is broken — and this state lasts
            // a second or two, which is long enough to press and not long enough
            // to investigate.
            label: isScreenShareEnabled
              ? 'Stop sharing your screen'
              : canStartShare
                ? 'Share your screen'
                : 'Share your screen — available once you are connected',
            icon: isScreenShareEnabled ? MonitorOff : MonitorUp,
            pressed: isScreenShareEnabled,
            disabled: !isScreenShareEnabled && !canStartShare,
            onClick: () => void toggleScreenShare(),
          },
        ]
      : []),
    {
      key: 'participants',
      // The count rides in the label because the badge itself is aria-hidden: an
      // aria-label overrides a button's contents, so a screen reader never reaches
      // the number unless it is written here.
      label: `${openPanel === 'participants' ? 'Hide' : 'Show'} participants (${participantCount})`,
      icon: Users,
      pressed: openPanel === 'participants',
      badge: participantCount,
      onClick: () => {
        disarmLeave();
        onTogglePanel('participants');
      },
    },
    {
      key: 'invite',
      label: 'Invite others',
      icon: LinkIcon,
      pressed: invite.open,
      onClick: openInvite,
    },
    {
      key: 'chat',
      // Never disabled, even when the link carries no key: the panel is the only
      // place with room to explain which of the two is true.
      //
      // The count rides in the label for the same reason it does on participants:
      // an aria-label overrides a button's contents, so the badge itself is
      // unreachable to a screen reader whatever it holds.
      label: `${openPanel === 'chat' ? 'Hide' : 'Show'} chat${
        unreadChat > 0 ? ` (${unreadChat} unread)` : ''
      }`,
      icon: MessageSquare,
      pressed: openPanel === 'chat',
      badge: unreadChat > 0 ? unreadChat : undefined,
      onClick: () => {
        disarmLeave();
        onTogglePanel('chat');
      },
    },
  ];

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
        {secondaryControls.map((control) => (
          <ControlButton
            key={control.key}
            label={control.label}
            icon={control.icon}
            pressed={control.pressed}
            toggled={control.pressed}
            onClick={control.onClick}
            badge={control.badge}
            disabled={control.disabled}
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
            {secondaryControls.map((control) => (
              <DropdownMenuItem
                key={control.key}
                disabled={control.disabled}
                onSelect={control.onClick}
              >
                <control.icon aria-hidden="true" className="size-4" />
                {control.label}
                {control.badge === undefined ? null : (
                  <span className="text-muted ml-auto">{control.badge}</span>
                )}
              </DropdownMenuItem>
            ))}

            {/* Below sm: the reactions popover would be a popover inside a menu.
                The same actions become flat menu items instead — one list, no
                nesting, and every one of them a 44px row. */}
            <DropdownMenuItem
              onSelect={() => {
                disarmLeave();
                toggleHand();
              }}
            >
              <Hand aria-hidden="true" className="size-4" />
              {raised ? 'Lower hand' : 'Raise hand'}
            </DropdownMenuItem>

            {REACTION_LABELS.map((label) => (
              <DropdownMenuItem
                key={label}
                onSelect={() => {
                  disarmLeave();
                  send(label);
                }}
              >
                <span className="tracking-wider uppercase">{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* The specimen's gap before Leave: it is the one control you must never
            hit by accident when reaching for the one beside it. */}
        {/* Its own control rather than a row entry: a popover trigger is not a
            ControlButton, and the bar is full at seven either way. */}
        <ReactionMenu onInteract={disarmLeave} className="hidden sm:inline-flex" />

        <span aria-hidden="true" className="w-3 flex-none" />

        <InviteDialog
          link={invite.link}
          hasKey={invite.hasKey}
          open={invite.open}
          onOpenChange={(open) => setInvite((current) => ({ ...current, open }))}
        />

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
