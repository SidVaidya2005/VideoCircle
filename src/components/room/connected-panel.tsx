'use client';

import {
  useConnectionState,
  useRemoteParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

import { SectionOverline } from '@/components/ui/section-overline';
import { Button } from '@/components/ui/button';

const STATUS: Record<ConnectionState, string> = {
  [ConnectionState.Disconnected]: 'Disconnected',
  [ConnectionState.Connecting]: 'Connecting',
  [ConnectionState.Connected]: 'Connected',
  [ConnectionState.Reconnecting]: 'Reconnecting',
  [ConnectionState.SignalReconnecting]: 'Reconnecting',
};

/**
 * The connected state, deliberately minimal.
 *
 * Feature 10 replaces this with the video grid. What has to exist now is proof
 * the token actually opens the room, and a way back out — a state a person
 * cannot leave is worse than one that looks unfinished, and closing the tab
 * instead strands the meeting's `room_finished` bookkeeping behind a timeout.
 */
export function ConnectedPanel() {
  const room = useRoomContext();
  const state = useConnectionState();
  const remotes = useRemoteParticipants();

  return (
    <div className="border-line/60 bg-card flex flex-col gap-4 rounded-lg border p-5">
      <SectionOverline>{STATUS[state]}</SectionOverline>

      <p className="text-ink-2 text-sm leading-normal" aria-live="polite">
        {remotes.length === 0
          ? 'You are the only one here. Share the link and this will update as people arrive.'
          : `${remotes.length} other ${remotes.length === 1 ? 'person' : 'people'} in the call.`}
      </p>

      {/* Reconnecting must never disable the way out. */}
      <Button type="button" variant="destructive" onClick={() => room.disconnect()}>
        Leave
      </Button>
    </div>
  );
}
