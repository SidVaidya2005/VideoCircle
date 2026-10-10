'use client';

import { TrackEvent, type LocalVideoTrack } from 'livekit-client';
import { useCallback, useSyncExternalStore } from 'react';

/** Front self-view is a mirror; a rear lens shows the scene in its real direction. */
export function useCameraMirror(track: LocalVideoTrack | undefined): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // Switching and unmuting replace the MediaStreamTrack inside the same
      // LocalVideoTrack. Watching the wrapper's identity alone misses both.
      track?.on(TrackEvent.Restarted, onChange);
      track?.on(TrackEvent.Unmuted, onChange);
      return () => {
        track?.off(TrackEvent.Restarted, onChange);
        track?.off(TrackEvent.Unmuted, onChange);
      };
    },
    [track],
  );
  const snapshot = useCallback(() => {
    if (!track) return false;
    const facing = track.getSourceTrackSettings().facingMode;
    // Desktop webcams often omit facingMode. Preserve their familiar mirrored
    // self-view; never infer a phone lens's direction from its localized label.
    return facing === 'user' || !facing;
  }, [track]);

  return useSyncExternalStore(subscribe, snapshot, () => false);
}
