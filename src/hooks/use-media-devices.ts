'use client';

import { Room } from 'livekit-client';
import { useEffect, useState } from 'react';

export interface MediaDeviceLists {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

const EMPTY: MediaDeviceLists = { cameras: [], microphones: [] };

async function enumerate(): Promise<MediaDeviceLists | null> {
  try {
    // `false` matters: the second argument asks the SDK to request permission if
    // it does not already have it. The lobby owns the one and only prompt, and an
    // enumeration must never raise a second one.
    const [cameras, microphones] = await Promise.all([
      Room.getLocalDevices('videoinput', false),
      Room.getLocalDevices('audioinput', false),
    ]);
    return { cameras, microphones };
  } catch (error) {
    // A picker with no options is survivable — the preview still runs on the
    // default device — so this never becomes a blocking failure.
    console.warn('[use-media-devices] could not enumerate devices', error);
    return null;
  }
}

/**
 * The cameras and microphones this browser can see.
 *
 * `labelsReady` gates the first read rather than a bare mount effect, because
 * `enumerateDevices` returns entries with **empty labels** until media permission
 * has been granted. Enumerating too early fills the pickers with blank rows that
 * never repopulate, so the caller passes `true` only once permission is known or
 * a track has actually been acquired.
 *
 * Re-read on `devicechange`, which is what makes plugging in a headset mid-lobby
 * appear without a reload.
 */
export function useMediaDevices(labelsReady: boolean): MediaDeviceLists {
  const [devices, setDevices] = useState<MediaDeviceLists>(EMPTY);

  useEffect(() => {
    if (!labelsReady) return;

    let cancelled = false;
    const mediaDevices = navigator.mediaDevices;

    function apply() {
      void (async () => {
        const lists = await enumerate();
        if (!cancelled && lists) setDevices(lists);
      })();
    }

    apply();
    mediaDevices.addEventListener('devicechange', apply);

    return () => {
      cancelled = true;
      mediaDevices.removeEventListener('devicechange', apply);
    };
  }, [labelsReady]);

  return devices;
}
