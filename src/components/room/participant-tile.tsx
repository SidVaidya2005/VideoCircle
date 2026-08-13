'use client';

import {
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { memo, useRef } from 'react';

import { TileMenu } from '@/components/room/tile-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toInitials } from '@/lib/initials';
import { cn } from '@/lib/utils';

/** How long a press has to hold before it counts as a pin. */
const LONG_PRESS_MS = 500;

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  /** `focus` is the large tile in spotlight; `strip` is a filmstrip thumbnail. */
  size?: 'grid' | 'focus' | 'strip';
  pinned?: boolean;
  onTogglePin?: () => void;
}

/** Shown for a remote participant whose token carried no name. Never their identity,
 *  which is `guest:<uuid>` and is neither readable nor ours to display. */
const UNNAMED = 'Guest';
const LOCAL_LABEL = 'You';

function ParticipantTileImpl({
  trackRef,
  size = 'grid',
  pinned = false,
  onTogglePin,
}: ParticipantTileProps) {
  const { participant } = trackRef;
  const isLocal = participant.isLocal;
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;

  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  // The hook reads an absent publication as unmuted, which is backwards for a
  // label: a participant publishing no microphone at all cannot be heard. Absent
  // and muted are the same fact to whoever is looking at the tile.
  const micMuted =
    useIsMuted({ participant, source: Track.Source.Microphone, publication: micPublication }) ||
    micPublication === undefined;

  // Suppressed on a share: the ring and the mute dot say something about the
  // person, and the person already has a camera tile of their own to say it on.
  const isSpeaking = useIsSpeaking(participant) && !isScreenShare;

  const name = participant.name?.trim() || (isLocal ? LOCAL_LABEL : UNNAMED);
  const personLabel = isLocal ? LOCAL_LABEL : name;
  const label = isScreenShare ? `${personLabel} — screen` : personLabel;

  // Read through the hook, never off `trackRef.publication.isMuted` directly.
  // LiveKit mutates the publication in place, so a component memoised on that
  // field compares the new value against itself and never sees the change — the
  // camera goes off and the tile keeps rendering a dead <video>. The hook holds
  // its own state and re-renders regardless of what the memo decides.
  const cameraMuted = useIsMuted(trackRef);

  // Muted is the only camera-off signal worth gating on. Waiting for
  // `isSubscribed` would deadlock adaptiveStream: it decides what to subscribe to
  // from the visibility of attached <video> elements, so a tile that renders no
  // element until it is subscribed is never subscribed and never renders one.
  const showsVideo = isTrackReference(trackRef) && !cameraMuted;

  // A long press is a press that outlasts the timer without moving. Held in a ref
  // rather than state: nothing renders from it, and a re-render per pointer event
  // is exactly what this tree cannot afford.
  const longPress = useRef<number | null>(null);

  function cancelLongPress() {
    if (longPress.current === null) return;
    window.clearTimeout(longPress.current);
    longPress.current = null;
  }

  function startLongPress() {
    if (!onTogglePin) return;
    cancelLongPress();
    longPress.current = window.setTimeout(() => {
      longPress.current = null;
      onTogglePin();
    }, LONG_PRESS_MS);
  }

  const tile = (
    <li
      className={cn(
        'group border-line/60 bg-card animate-tile-in relative overflow-hidden rounded-lg border',
        // Speaking is a white ring — the kit's engaged state. Never a colour: a
        // coloured border on a tile is reserved for nothing at all.
        'ease-out-quint transition-shadow duration-150',
        isSpeaking && 'ring-active ring-2',
        // The focused tile fills the space it is given; grid and strip tiles keep
        // 16:9 so rows stay even and the strip scrolls predictably.
        size === 'focus' ? 'size-full' : 'aspect-video',
        size === 'strip' && 'w-40 flex-none lg:w-full',
        onTogglePin && 'select-none',
      )}
      onDoubleClick={onTogglePin}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerMove={cancelLongPress}
      // Android's long-press menu and desktop right-click both land here and
      // would fire over the gesture.
      onContextMenu={onTogglePin ? (event) => event.preventDefault() : undefined}
    >
      {showsVideo ? (
        <VideoTrack
          trackRef={trackRef}
          // object-contain, not cover: a 4:3 webcam letterboxes into the frame
          // rather than losing the top of someone's head. Mirrored for the local
          // participant only — a self-view is a mirror, a remote tile is not.
          // Never mirrored on a share: only a self-*camera* is a mirror, and a
          // flipped spreadsheet is unreadable.
          className={cn('size-full object-contain', isLocal && !isScreenShare && '-scale-x-100')}
        />
      ) : (
        <div className="bg-raised absolute inset-0 flex items-center justify-center">
          {/* Initials stand in for a camera that is off. A share has no off state —
              if its reference exists the share is live — so on the rare frame
              before its track attaches, the label alone carries the tile.
              Hidden from assistive tech: the name sits directly below it. */}
          {isScreenShare ? null : (
            <span aria-hidden="true" className="text-muted text-2xl font-bold">
              {toInitials(name)}
            </span>
          )}
        </div>
      )}

      {/* The scrim is the rule for any text over live video: every other contrast
          pairing here assumes a known --bg-*, and a participant backlit by a window
          erases a muted grey outright. Arbitrary utilities because the tokens are
          a gradient and a percentage height, which no colour utility covers. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[var(--scrim-tile-height)] bg-[image:var(--scrim-tile)]"
      />

      <p className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 text-xs tracking-wide uppercase">
        {micMuted && !isScreenShare ? (
          <>
            {/* Red marks your own muted mic and nothing else. Twelve red badges on a
                twelve-person grid would destroy the signal exactly when Leave needs it. */}
            <span
              aria-hidden="true"
              className={cn('size-1.5 flex-none', isLocal ? 'bg-signal' : 'bg-muted')}
            />
            <span className="sr-only">Muted:</span>
          </>
        ) : null}
        {/* text-ink on the scrim, never a muted grey — those are for known backgrounds. */}
        <span className="text-ink truncate">{label}</span>
        {pinned ? <span className="text-muted flex-none">· pinned</span> : null}
      </p>

      {onTogglePin ? (
        <TileMenu participantLabel={label} pinned={pinned} onTogglePin={onTogglePin} />
      ) : null}
    </li>
  );

  if (!onTogglePin) return tile;

  // Names the gesture, which is otherwise unguessable. Hover-only by nature, so
  // it reaches desktop and not phones — phones get the always-visible menu button
  // instead, which is the other half of the same answer.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{tile}</TooltipTrigger>
      <TooltipContent side="top">
        {pinned ? 'Double-click to unpin' : 'Double-click to pin'}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One participant's cell in the grid.
 *
 * Memoised on identity and publication rather than by reference: `useTracks`
 * rebuilds its track references on every room event — someone muting, someone
 * speaking, a quality change — and a tile that re-rendered on each of those would
 * do so twelve times over. Mute and speaking state arrive through this tile's own
 * hooks, so they still update while the props stay equal.
 *
 * The comparator reads only immutable facts. `isMuted` was compared here once and
 * could never differ: LiveKit mutates the publication object in place, so both
 * sides of the comparison resolve to the same live value. `trackSid` is safe
 * because it changes only when the publication itself is replaced or removed,
 * which is exactly the transition the memo must not swallow.
 *
 * `pinned` and `size` are compared because they are what the parent changes when
 * the layout moves — a comparator that ignored them would leave a pinned tile
 * rendering as unpinned, which is the same defect the `isMuted` comparison had.
 * `onTogglePin` is deliberately not compared: it is a fresh closure every render
 * and would defeat the memo outright, while always closing over the correct key.
 */
export const ParticipantTile = memo(
  ParticipantTileImpl,
  (previous, next) =>
    previous.trackRef.participant.identity === next.trackRef.participant.identity &&
    previous.trackRef.participant.name === next.trackRef.participant.name &&
    previous.trackRef.publication?.trackSid === next.trackRef.publication?.trackSid &&
    previous.pinned === next.pinned &&
    previous.size === next.size,
);
