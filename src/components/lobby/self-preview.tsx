'use client';

import type { LocalVideoTrack } from 'livekit-client';
import { useEffect, useRef } from 'react';

interface SelfPreviewProps {
  track: LocalVideoTrack;
}

/**
 * The local camera, mirrored and letterboxed.
 *
 * Mirrored because a self-preview is a mirror: raising your left hand has to move
 * the hand on the left, or it reads as someone else's video. Only this preview is
 * flipped — remote tiles never are.
 */
export function SelfPreview({ track }: SelfPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    track.attach(element);

    return () => {
      // Detach from this element specifically. The no-argument `detach()` releases
      // every element the track was ever attached to, which during development's
      // double-mount tears the video out of the element that is still on screen.
      track.detach(element);
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      // object-contain, not cover: a 4:3 webcam letterboxes into the 16:9 frame
      // rather than having the top of someone's head cropped off.
      className="size-full -scale-x-100 object-contain"
    />
  );
}
