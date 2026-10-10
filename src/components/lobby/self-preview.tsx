'use client';

import type { LocalVideoTrack } from 'livekit-client';
import { useEffect, useRef } from 'react';

import { useCameraMirror } from '@/hooks/use-camera-mirror';
import { cn } from '@/lib/utils';

interface SelfPreviewProps {
  track: LocalVideoTrack;
}

/**
 * The local camera, letterboxed. Only a front-facing self-view is mirrored;
 * a rear-facing camera shows the scene normally, including readable text.
 */
export function SelfPreview({ track }: SelfPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mirrored = useCameraMirror(track);

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
      className={cn('size-full object-contain', mirrored && '-scale-x-100')}
    />
  );
}
