'use client';

import { useRoomContext } from '@livekit/components-react';

import { CallStatus } from '@/components/room/call-status';
import { ControlBar } from '@/components/room/control-bar';
import { ParticipantCount } from '@/components/room/participant-count';
import { VideoGrid } from '@/components/room/video-grid';

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-3">
      <div className="flex flex-none items-center justify-between gap-4">
        <CallStatus />
        <ParticipantCount />
      </div>

      <VideoGrid />

      {/* Nothing here is disabled while reconnecting — that is exactly when the
          controls are reached for. */}
      <ControlBar onLeave={() => void room.disconnect()} />
    </div>
  );
}
