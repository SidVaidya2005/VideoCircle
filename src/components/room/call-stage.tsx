'use client';

import { useConnectionState, useRoomContext } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

import { ParticipantCount } from '@/components/room/participant-count';
import { VideoGrid } from '@/components/room/video-grid';
import { Button } from '@/components/ui/button';

/**
 * What the status strip reads in each connection state.
 *
 * `SignalReconnecting` is folded into `Reconnecting`: the distinction is which
 * connection dropped, which is ours to handle and not the participant's to read.
 */
const STATUS: Record<ConnectionState, string> = {
  [ConnectionState.Disconnected]: 'Disconnected',
  [ConnectionState.Connecting]: 'Connecting',
  [ConnectionState.Connected]: 'Connected',
  [ConnectionState.Reconnecting]: 'Reconnecting',
  [ConnectionState.SignalReconnecting]: 'Reconnecting',
};

/**
 * The call: status pinned top, grid between, controls pinned bottom.
 *
 * The tree never unmounts on a reconnect. Tearing the grid down would drop every
 * attached video element, and adaptiveStream would have to rebuild its
 * subscriptions from nothing once the signal came back — a transient blip
 * rendered as a full rejoin.
 */
export function CallStage() {
  const room = useRoomContext();
  const state = useConnectionState();
  const reconnecting =
    state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-3">
      <div className="flex flex-none items-center justify-between gap-4">
        {/* Polite: a reconnect resolves on its own, and an assertive region would
            interrupt whatever a screen reader was already saying. */}
        <p
          aria-live="polite"
          className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase"
        >
          {reconnecting ? (
            // Static, not the looping live-dot: a continuous keyframe is fine on
            // Home and not inside a call, which is encoding video on whatever
            // device is weakest. White rather than red — reconnecting is a state,
            // not a destructive action.
            <span aria-hidden="true" className="bg-active size-1.5 flex-none" />
          ) : null}
          {STATUS[state]}
        </p>
        <ParticipantCount />
      </div>

      <VideoGrid />

      {/* Feature 11 replaces this with the control bar. Something has to lead out
          of the call before then: closing the tab instead strands the meeting's
          room_finished bookkeeping behind a timeout, and a surface a person cannot
          leave is worse than one that looks unfinished.

          Never disabled while reconnecting — that is exactly when it is reached for. */}
      <div className="flex flex-none justify-center">
        <Button type="button" variant="destructive" onClick={() => room.disconnect()}>
          Leave
        </Button>
      </div>
    </div>
  );
}
