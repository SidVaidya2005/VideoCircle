'use client';

import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { ConnectionState, LocalVideoTrack } from 'livekit-client';
import { useRef, useState } from 'react';

import { useMediaDevices } from '@/hooks/use-media-devices';
import { readPreferences, writePreferences } from '@/lib/media/preferences';

interface CameraSwitchController {
  available: boolean;
  busy: boolean;
  error: string | null;
  switchCamera: () => Promise<void>;
}

// Switching an enumerated lens is not waiting for a permission decision.
const SWITCH_TIMEOUT_MS = 8_000;
class CameraSwitchTimeout extends Error {}

async function withinDeadline(operation: Promise<boolean>): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CameraSwitchTimeout()), SWITCH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

/** Cycles available lenses without reconnecting or touching the microphone. */
export function useCameraSwitch(): CameraSwitchController {
  const room = useRoomContext();
  const { cameraTrack } = useLocalParticipant();
  // Counting devices needs no labels, prompt or live camera publication.
  const { cameras } = useMediaDevices(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref closes the double-tap window before React commits the disabled state.
  const switching = useRef(false);

  async function switchCamera(): Promise<void> {
    if (switching.current || cameras.length < 2) return;
    const track = cameraTrack?.track instanceof LocalVideoTrack ? cameraTrack.track : undefined;
    const current =
      // Muted capture still describes the last live lens, not the pending choice.
      (track && !track.isMuted ? track.getSourceTrackSettings().deviceId : undefined) ??
      room.getActiveDevice('videoinput') ??
      cameras[0]?.deviceId;
    const index = cameras.findIndex((camera) => camera.deviceId === current);
    const next = cameras[(index + 1) % cameras.length];
    if (!next) return;

    switching.current = true;
    setBusy(true);
    setError(null);
    function releaseCamera() {
      // stop() also makes LiveKit stop a capture that arrives after a restart.
      track?.stop();
      if (track) {
        // The SDK removes the publication before awaiting network negotiation;
        // the camera becomes off without keeping controls waiting on the network.
        void room.localParticipant.unpublishTrack(track).catch((failure) => {
          console.warn('[room/camera-switch] could not unpublish stopped camera', failure);
        });
      }
    }
    try {
      // LiveKit updates capture in place. When camera-off, it remembers the lens
      // for the next unmute and leaves the hardware off.
      const changed = await withinDeadline(room.switchActiveDevice('videoinput', next.deviceId));
      if (!changed) throw new Error('Requested camera was not selected');
      writePreferences({ ...readPreferences(), cameraId: next.deviceId });
    } catch (failure) {
      console.warn('[room/camera-switch] could not switch camera', failure);
      // Leaving stops the SDK's tracks. Never reacquire after a disconnect.
      if (room.state === ConnectionState.Disconnected) return;
      const timedOut = failure instanceof CameraSwitchTimeout;
      if (timedOut) releaseCamera();
      try {
        // A failed SDK restart already stopped the original source and changed
        // its constraints. Restore the actual previous lens, not just room defaults.
        if (current) {
          const restored = await withinDeadline(room.switchActiveDevice('videoinput', current));
          if (!restored) throw new Error('Previous camera was not restored');
        }
        setError(
          timedOut
            ? 'Camera switch timed out. Your camera is off; turn it on to try again.'
            : 'Could not switch camera. Try again, or turn the camera off and on.',
        );
      } catch (recoveryFailure) {
        console.warn('[room/camera-switch] could not restore camera', recoveryFailure);
        releaseCamera();
        setError('Could not restore the camera. Turn it on to try again.');
      }
    } finally {
      switching.current = false;
      setBusy(false);
    }
  }

  return { available: cameras.length > 1, busy, error, switchCamera };
}
