'use client';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { useMemo } from 'react';

import { roomOptions } from '@/lib/livekit/room-options';

interface RoomShellProps {
  serverUrl: string;
  token: string;
  /** The lobby's mic and camera state, carried into the call. */
  audio: boolean;
  video: boolean;
  cameraId: string | undefined;
  microphoneId: string | undefined;
  onDisconnected: () => void;
  children: React.ReactNode;
}

export function RoomShell({
  serverUrl,
  token,
  audio,
  video,
  cameraId,
  microphoneId,
  onDisconnected,
  children,
}: RoomShellProps) {
  // Memoised on the device ids, not rebuilt per render. <LiveKitRoom> re-creates
  // its Room whenever this object's identity changes, so an inline literal would
  // reconnect the call on every render.
  const options = useMemo(() => roomOptions({ cameraId, microphoneId }), [cameraId, microphoneId]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={audio}
      video={video}
      options={options}
      onDisconnected={onDisconnected}
      // <LiveKitRoom> renders a container div of its own, which sits between the
      // page's flex column and the call. Without these it is a static-height box
      // and the grid below it has nothing to grow into, so a full-height call
      // collapses to the height of its own content.
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
      {/* Renders every remote audio track. Without it the call is silent, and it
          is the kind of bug that gets misdiagnosed as a media problem. */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
