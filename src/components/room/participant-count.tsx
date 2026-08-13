'use client';

import { useRemoteParticipants } from '@livekit/components-react';

/**
 * Headcount, kept in its own leaf.
 *
 * `useRemoteParticipants` fires on every join and leave. Reading it here rather
 * than in the stage means those events re-render one short line instead of the
 * whole call surface.
 */
export function ParticipantCount() {
  const remotes = useRemoteParticipants();

  return (
    <p aria-live="polite" className="text-muted flex-none text-xs tracking-wider uppercase">
      {remotes.length === 0 ? 'Only you' : `${remotes.length + 1} in call`}
    </p>
  );
}
