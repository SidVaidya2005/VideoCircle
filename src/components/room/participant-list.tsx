'use client';

import { useIsMuted, useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';

import { toInitials } from '@/lib/initials';
import { sortParticipants } from '@/lib/participants';
import { cn } from '@/lib/utils';

/** Matches the tile: never an identity, which is `guest:<uuid>` and not ours to show. */
const UNNAMED = 'Guest';

interface ParticipantRowProps {
  participant: Participant;
}

function ParticipantRow({ participant }: ParticipantRowProps) {
  const isLocal = participant.isLocal;
  const name = participant.name?.trim() || (isLocal ? 'You' : UNNAMED);

  // Read through the hook per row, exactly as the tile does. Reading
  // `participant.isMicrophoneEnabled` here would depend on `useParticipants`
  // re-rendering for events it does not promise, and LiveKit mutates publications
  // in place — the defect found in F11 and again in F13.
  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  const micMuted =
    useIsMuted({ participant, source: Track.Source.Microphone, publication: micPublication }) ||
    micPublication === undefined;

  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const cameraOff =
    useIsMuted({ participant, source: Track.Source.Camera, publication: cameraPublication }) ||
    cameraPublication === undefined;

  return (
    <li className="flex min-h-11 items-center gap-3">
      <span
        aria-hidden="true"
        className="bg-raised text-muted flex size-8 flex-none items-center justify-center rounded-xs text-xs font-bold"
      >
        {toInitials(name)}
      </span>

      {/* Two lines rather than one. Side by side, the state labels take enough of a
          288px panel that "Ada Lovelace" truncates to "Ada Lovela…" — and a
          participant list whose one job is naming people cannot eat the names. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ink truncate text-sm">
          {name}
          {isLocal ? <span className="text-muted"> · you</span> : null}
        </span>

        {/* Neutral, not red. Red in a call is the Leave control and your own muted
            mic on your own tile; a list of twelve red dots would destroy that. */}
        <span className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
          <span className={cn(micMuted && 'text-faint')}>{micMuted ? 'mic off' : 'mic on'}</span>
          <span className={cn(cameraOff && 'text-faint')}>{cameraOff ? 'cam off' : 'cam on'}</span>
        </span>
      </span>
    </li>
  );
}

/**
 * Everyone in the call, derived from LiveKit and nowhere else.
 *
 * No local mirror of the roster: a second copy is the thing that goes stale, which
 * is the same reasoning that keeps the screen-share state unmirrored in F12.
 */
export function ParticipantList() {
  const participants = useParticipants();

  // LiveKit stamps `joinedAt` as a Date; the sort takes milliseconds so it can
  // stay a pure module with no LiveKit types in it. Mapping happens here, at the
  // boundary, rather than widening the shared shape.
  const ordered = sortParticipants(
    participants.map((participant) => ({
      participant,
      isLocal: participant.isLocal,
      identity: participant.identity,
      joinedAt: participant.joinedAt?.getTime(),
    })),
  );

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto">
      {ordered.map(({ participant }) => (
        <ParticipantRow key={participant.identity} participant={participant} />
      ))}
    </ul>
  );
}
