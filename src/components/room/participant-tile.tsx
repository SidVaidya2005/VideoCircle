'use client';

import {
  isTrackReference,
  useIsMuted,
  useIsSpeaking,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { memo } from 'react';

import { toInitials } from '@/lib/initials';
import { cn } from '@/lib/utils';

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
}

/** Shown for a remote participant whose token carried no name. Never their identity,
 *  which is `guest:<uuid>` and is neither readable nor ours to display. */
const UNNAMED = 'Guest';
const LOCAL_LABEL = 'You';

function ParticipantTileImpl({ trackRef }: ParticipantTileProps) {
  const { participant } = trackRef;
  const isLocal = participant.isLocal;

  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  // The hook reads an absent publication as unmuted, which is backwards for a
  // label: a participant publishing no microphone at all cannot be heard. Absent
  // and muted are the same fact to whoever is looking at the tile.
  const micMuted =
    useIsMuted({ participant, source: Track.Source.Microphone, publication: micPublication }) ||
    micPublication === undefined;

  const isSpeaking = useIsSpeaking(participant);

  const name = participant.name?.trim() || (isLocal ? LOCAL_LABEL : UNNAMED);
  const label = isLocal ? LOCAL_LABEL : name;

  // Muted is the only camera-off signal worth gating on. Waiting for
  // `isSubscribed` would deadlock adaptiveStream: it decides what to subscribe to
  // from the visibility of attached <video> elements, so a tile that renders no
  // element until it is subscribed is never subscribed and never renders one.
  const showsVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;

  return (
    <li
      className={cn(
        'border-line/60 bg-card animate-tile-in relative aspect-video overflow-hidden rounded-lg border',
        // Speaking is a white ring — the kit's engaged state. Never a colour: a
        // coloured border on a tile is reserved for nothing at all.
        'ease-out-quint transition-shadow duration-150',
        isSpeaking && 'ring-active ring-2',
      )}
    >
      {showsVideo ? (
        <VideoTrack
          trackRef={trackRef}
          // object-contain, not cover: a 4:3 webcam letterboxes into the frame
          // rather than losing the top of someone's head. Mirrored for the local
          // participant only — a self-view is a mirror, a remote tile is not.
          className={cn('size-full object-contain', isLocal && '-scale-x-100')}
        />
      ) : (
        <div className="bg-raised absolute inset-0 flex items-center justify-center">
          {/* Initials on the elevation ladder. No generated avatar, no illustration.
              Hidden from assistive tech: the name sits directly below it. */}
          <span aria-hidden="true" className="text-muted text-2xl font-bold">
            {toInitials(name)}
          </span>
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
        {micMuted ? (
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
      </p>
    </li>
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
 */
export const ParticipantTile = memo(
  ParticipantTileImpl,
  (previous, next) =>
    previous.trackRef.participant.identity === next.trackRef.participant.identity &&
    previous.trackRef.participant.name === next.trackRef.participant.name &&
    previous.trackRef.publication?.trackSid === next.trackRef.publication?.trackSid &&
    previous.trackRef.publication?.isMuted === next.trackRef.publication?.isMuted,
);
