'use client';

import {
  createLocalTracks,
  Track,
  type CreateLocalTracksOptions,
  type LocalAudioTrack,
  type LocalTrack,
  type LocalVideoTrack,
} from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useMediaDevices, type MediaDeviceLists } from '@/hooks/use-media-devices';
import { classifyMediaError, type MediaFailure } from '@/lib/media/classify-media-error';
import { DEFAULT_PREFERENCES, readPreferences, writePreferences } from '@/lib/media/preferences';

/**
 * One device's worth of lobby state.
 *
 * `enabled` is what the person asked for; `track` is what they got. The two
 * disagree whenever a device is switched on and fails, and the UI needs both to
 * show a toggle in its on position above an explanation of why nothing appeared.
 */
export interface TrackState<T extends LocalTrack> {
  track: T | null;
  enabled: boolean;
  /** An acquire or a switch is in flight. Controls disable rather than queue. */
  busy: boolean;
  failure: MediaFailure | null;
  deviceId: string | undefined;
}

export interface MediaPreviewController {
  camera: TrackState<LocalVideoTrack>;
  microphone: TrackState<LocalAudioTrack>;
  /** Set only when the first acquisition failed for both devices at once. */
  blockingFailure: MediaFailure | null;
  devices: MediaDeviceLists;
  setCameraEnabled: (enabled: boolean) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  selectCamera: (deviceId: string) => void;
  selectMicrophone: (deviceId: string) => void;
  /**
   * Releases every preview track, keeping the on/off intent so it can be carried
   * into the call. Called immediately before connecting: a preview track left
   * running holds the camera the room is about to ask for, and on some devices
   * that blocks the room from acquiring it at all.
   */
  stopPreview: () => void;
}

/**
 * How long to wait for a device that cannot be waiting on a person.
 *
 * `getUserMedia` is not guaranteed to settle — reproduced on the development
 * machine, where an audio request never returns while the camera opens normally.
 * A promise that never settles leaves the lobby waiting forever.
 *
 * Only ever started once permission is known granted. While a prompt may still
 * be open the request is waiting on a human, and someone who takes fifteen
 * seconds to find Allow has not experienced a failure.
 */
const ACQUIRE_TIMEOUT_MS = 8_000;

/**
 * TypeScript's `PermissionName` omits `camera` and `microphone`, although both
 * are in the Permissions API registry and queryable in Chromium.
 */
type MediaPermissionName = 'camera' | 'microphone';

async function permissionAlreadyGranted(): Promise<boolean> {
  const names: MediaPermissionName[] = ['camera', 'microphone'];

  try {
    const states = await Promise.all(
      // The one cast: bridging the narrow type above onto a lib definition that
      // does not know these names exist.
      names.map((name) => navigator.permissions.query({ name } as unknown as PermissionDescriptor)),
    );
    return states.every((status) => status.state === 'granted');
  } catch {
    // Firefox rejects outright for these names, and older Safari does too.
    // "Unknown" has to mean "a prompt may be coming", which is the answer that
    // cannot produce a false timeout.
    return false;
  }
}

interface TimedOut {
  timedOut: true;
}

function findVideo(tracks: LocalTrack[]): LocalVideoTrack | null {
  return tracks.find((track): track is LocalVideoTrack => track.kind === Track.Kind.Video) ?? null;
}

function findAudio(tracks: LocalTrack[]): LocalAudioTrack | null {
  return tracks.find((track): track is LocalAudioTrack => track.kind === Track.Kind.Audio) ?? null;
}

async function withTimeout(options: CreateLocalTracksOptions): Promise<LocalTrack[] | TimedOut> {
  let abandoned = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const request = createLocalTracks(options).then((tracks) => {
    if (abandoned) {
      // Arrived after we stopped waiting. Nothing downstream is holding these, so
      // releasing them here is the only thing that turns the camera light off.
      for (const track of tracks) track.stop();
      return [];
    }
    return tracks;
  });

  const expiry = new Promise<TimedOut>((resolve) => {
    timer = setTimeout(() => {
      abandoned = true;
      resolve({ timedOut: true });
    }, ACQUIRE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

async function acquire(
  options: CreateLocalTracksOptions,
  timed: boolean,
): Promise<{ tracks: LocalTrack[]; failure: MediaFailure | null }> {
  try {
    if (!timed) {
      return { tracks: await createLocalTracks(options), failure: null };
    }

    const result = await withTimeout(options);
    return 'timedOut' in result
      ? { tracks: [], failure: 'timeout' }
      : { tracks: result, failure: null };
  } catch (error) {
    return { tracks: [], failure: classifyMediaError(error) };
  }
}

/**
 * Owns the lobby's local tracks: acquiring them, switching them, releasing them.
 *
 * **Off means stopped, never muted.** A preview that reads OFF while the camera
 * light stays lit is the one thing that breaks trust in a lobby. It also keeps
 * the SDK's muted-track trap out of reach: `setDeviceId` sets `pendingDeviceChange`
 * and returns early on a muted track, so a picker would appear to do nothing
 * until the track was unmuted.
 */
export function useMediaPreview(): MediaPreviewController {
  const [camera, setCamera] = useState<TrackState<LocalVideoTrack>>({
    track: null,
    enabled: DEFAULT_PREFERENCES.cameraOn,
    busy: true,
    failure: null,
    deviceId: undefined,
  });
  const [microphone, setMicrophone] = useState<TrackState<LocalAudioTrack>>({
    track: null,
    enabled: DEFAULT_PREFERENCES.microphoneOn,
    busy: true,
    failure: null,
    deviceId: undefined,
  });
  const [blockingFailure, setBlockingFailure] = useState<MediaFailure | null>(null);
  const [labelsReady, setLabelsReady] = useState(false);

  const devices = useMediaDevices(labelsReady);

  // Every track this hook has opened, so unmount can release them without
  // depending on a state snapshot the cleanup closure may not have.
  const openTracks = useRef(new Set<LocalTrack>());
  // Bumped per kind on every request. A result whose generation is stale belongs
  // to a request the user has already overridden by toggling again.
  const generation = useRef({ camera: 0, microphone: 0 });
  const mounted = useRef(true);

  const hold = useCallback((track: LocalTrack | null) => {
    if (track) openTracks.current.add(track);
  }, []);

  const release = useCallback((track: LocalTrack | null) => {
    if (!track) return;
    track.stop();
    openTracks.current.delete(track);
  }, []);

  // Preferences are written from one place, so the stored set can never be a
  // half-updated mix of two changes.
  const persist = useCallback(
    (next: Partial<ReturnType<typeof readPreferences>>) => {
      writePreferences({
        cameraOn: camera.enabled,
        microphoneOn: microphone.enabled,
        cameraId: camera.deviceId,
        microphoneId: microphone.deviceId,
        ...next,
      });
    },
    [camera.enabled, camera.deviceId, microphone.enabled, microphone.deviceId],
  );

  useEffect(() => {
    // Local to this run of the effect, deliberately, and NOT the shared `mounted`
    // ref. React double-invokes effects in development: the first run's cleanup
    // sets a shared flag false, then the second run sets it true again, so the
    // first request sees "still mounted" when it resolves and holds its track
    // alongside the second's. That leaks a live camera — two tracks, one of them
    // owned by nothing.
    let cancelled = false;
    mounted.current = true;
    const tracks = openTracks.current;
    // Snapshot taken before the first await. Everything that supersedes this run
    // — a toggle, or `stopPreview()` at Join — bumps one of these, and comparing
    // against the snapshot is the only way this run can tell it has been.
    const mine = { ...generation.current };

    void (async () => {
      // Read here rather than in a useState initializer: this runs on the server
      // too, where localStorage does not exist, and a differing initial value
      // would be a hydration mismatch.
      const preferences = readPreferences();
      const granted = await permissionAlreadyGranted();
      setLabelsReady(granted);

      // Seeded before any acquisition, and before the both-off early return
      // below. Without this a lobby that opens with everything off never learns
      // the remembered devices at all: the pickers would show "system default"
      // and toggling on would ask for the wrong camera.
      setCamera((state) => ({ ...state, deviceId: preferences.cameraId }));
      setMicrophone((state) => ({ ...state, deviceId: preferences.microphoneId }));

      const wantCamera = preferences.cameraOn;
      const wantMic = preferences.microphoneOn;

      const applyOff = () => {
        setCamera((state) => ({ ...state, enabled: false, busy: false }));
        setMicrophone((state) => ({ ...state, enabled: false, busy: false }));
      };

      if (!wantCamera && !wantMic) {
        // Someone who left with everything off gets it back that way, and no
        // device is touched at all — which is the point of turning them off.
        applyOff();
        return;
      }

      let cameraResult: { track: LocalVideoTrack | null; failure: MediaFailure | null } = {
        track: null,
        failure: null,
      };
      let micResult: { track: LocalAudioTrack | null; failure: MediaFailure | null } = {
        track: null,
        failure: null,
      };

      if (!granted && wantCamera && wantMic) {
        // One combined request so the browser raises a single prompt covering
        // both devices, answered at the person's own pace. Untimed for the same
        // reason.
        // The remembered devices go into the combined request too. Passing bare
        // `true` here would honour the stored choice on the already-granted path
        // and silently drop it on this one.
        const combined = await acquire(
          {
            audio: { deviceId: preferences.microphoneId },
            video: { deviceId: preferences.cameraId },
          },
          false,
        );

        if (!combined.failure) {
          cameraResult = { track: findVideo(combined.tracks), failure: null };
          micResult = { track: findAudio(combined.tracks), failure: null };
        } else if (combined.failure === 'denied') {
          // A refusal covers both devices, and asking again only re-prompts.
          if (!cancelled) {
            setBlockingFailure('denied');
            setCamera((state) => ({ ...state, enabled: false, busy: false, failure: 'denied' }));
            setMicrophone((state) => ({
              ...state,
              enabled: false,
              busy: false,
              failure: 'denied',
            }));
          }
          return;
        }
      }

      // Per device: either permission was already settled, only one device was
      // wanted, or the combined request failed for a reason worth pinning down.
      // The combined form is all-or-nothing in a way that hides the truth — one
      // dead camera sinks it and takes a working microphone down too.
      // The stored id goes through as a bare `deviceId`, an ideal constraint: a
      // device that has since been unplugged falls back to the default rather
      // than failing the request.
      if (!cameraResult.track && wantCamera) {
        const result = await acquire({ video: { deviceId: preferences.cameraId } }, granted);
        cameraResult = { track: findVideo(result.tracks), failure: result.failure };
      }
      if (!micResult.track && wantMic) {
        const result = await acquire({ audio: { deviceId: preferences.microphoneId } }, granted);
        micResult = { track: findAudio(result.tracks), failure: result.failure };
      }

      // `cancelled` covers this effect run being torn down, and nothing else.
      // It does NOT cover Join: `stopPreview()` leaves the hook mounted and
      // signals abandonment by bumping the generation counters instead. Every
      // toggle path reads those; this one — the original acquisition — did not,
      // so a microphone request still in flight at Join resolved with nothing
      // cancelled and was adopted into a lobby that had already handed off. The
      // device then stayed open for the whole call, under a control reading
      // muted. See `tests/e2e/join.spec.ts`.
      const superseded =
        generation.current.camera !== mine.camera ||
        generation.current.microphone !== mine.microphone;

      if (cancelled || superseded) {
        // Resolved after this run stopped being the current one, so nothing
        // downstream will ever hold these.
        release(cameraResult.track);
        release(micResult.track);
        return;
      }

      hold(cameraResult.track);
      hold(micResult.track);
      setLabelsReady(granted || Boolean(cameraResult.track) || Boolean(micResult.track));

      // Blocking only when everything asked for failed. One working device means
      // a usable lobby with an inline note about the other.
      const everythingFailed =
        !cameraResult.track && !micResult.track && (cameraResult.failure ?? micResult.failure);
      if (everythingFailed) {
        setBlockingFailure(cameraResult.failure ?? micResult.failure);
      }

      setCamera((state) => ({
        ...state,
        track: cameraResult.track,
        enabled: wantCamera,
        busy: false,
        failure: cameraResult.failure,
        // Falls back to the remembered id when nothing was acquired, so a
        // transient failure does not also wipe the device choice for the session.
        deviceId:
          cameraResult.track?.mediaStreamTrack.getSettings().deviceId ?? preferences.cameraId,
      }));
      setMicrophone((state) => ({
        ...state,
        track: micResult.track,
        enabled: wantMic,
        busy: false,
        failure: micResult.failure,
        deviceId:
          micResult.track?.mediaStreamTrack.getSettings().deviceId ?? preferences.microphoneId,
      }));
    })();

    return () => {
      cancelled = true;
      mounted.current = false;
      for (const track of tracks) track.stop();
      tracks.clear();
    };
  }, [hold, release]);

  const setCameraEnabled = useCallback(
    (enabled: boolean) => {
      const mine = (generation.current.camera += 1);
      persist({ cameraOn: enabled });

      if (!enabled) {
        // Stopping the track happens here, never inside the updater below. React
        // double-invokes updaters in development, and an updater that stops a
        // device is not pure — it would fire the side effect twice, against
        // whatever snapshot each invocation happened to see.
        release(camera.track);
        setCamera((state) => ({
          ...state,
          enabled: false,
          busy: false,
          track: null,
          failure: null,
        }));
        return;
      }

      setCamera((state) => ({ ...state, enabled: true, busy: true }));

      void (async () => {
        const granted = await permissionAlreadyGranted();
        const result = await acquire({ video: { deviceId: camera.deviceId } }, granted);
        const track = findVideo(result.tracks);

        if (!mounted.current || generation.current.camera !== mine) {
          // Toggled again while this was in flight. Whoever won owns the state;
          // this track has no reader, so it has to be stopped here.
          release(track);
          return;
        }

        hold(track);
        setLabelsReady(true);
        setCamera((state) => ({ ...state, track, busy: false, failure: result.failure }));
      })();
    },
    [camera.track, camera.deviceId, hold, release, persist],
  );

  const setMicrophoneEnabled = useCallback(
    (enabled: boolean) => {
      const mine = (generation.current.microphone += 1);
      persist({ microphoneOn: enabled });

      if (!enabled) {
        // Outside the updater, for the same reason as the camera above.
        release(microphone.track);
        setMicrophone((state) => ({
          ...state,
          enabled: false,
          busy: false,
          track: null,
          failure: null,
        }));
        return;
      }

      setMicrophone((state) => ({ ...state, enabled: true, busy: true }));

      void (async () => {
        const granted = await permissionAlreadyGranted();
        const result = await acquire({ audio: { deviceId: microphone.deviceId } }, granted);
        const track = findAudio(result.tracks);

        if (!mounted.current || generation.current.microphone !== mine) {
          release(track);
          return;
        }

        hold(track);
        setLabelsReady(true);
        setMicrophone((state) => ({ ...state, track, busy: false, failure: result.failure }));
      })();
    },
    [microphone.track, microphone.deviceId, hold, release, persist],
  );

  const selectCamera = useCallback(
    (deviceId: string) => {
      persist({ cameraId: deviceId });
      setCamera((state) => ({ ...state, deviceId, busy: Boolean(state.track) }));

      const track = camera.track;
      // Off means no track to restart, so the choice is simply remembered and
      // applied by the next acquire.
      if (!track) return;

      void (async () => {
        try {
          // Restarts capture in place rather than republishing — the SDK's own
          // path for this, and the reason the preview does not flicker.
          await track.setDeviceId(deviceId);
        } catch (error) {
          console.warn('[use-media-preview] could not switch camera', error);
        }
        if (mounted.current) setCamera((state) => ({ ...state, busy: false }));
      })();
    },
    [camera.track, persist],
  );

  const selectMicrophone = useCallback(
    (deviceId: string) => {
      persist({ microphoneId: deviceId });
      setMicrophone((state) => ({ ...state, deviceId, busy: Boolean(state.track) }));

      const track = microphone.track;
      if (!track) return;

      void (async () => {
        try {
          await track.setDeviceId(deviceId);
        } catch (error) {
          console.warn('[use-media-preview] could not switch microphone', error);
        }
        if (mounted.current) setMicrophone((state) => ({ ...state, busy: false }));
      })();
    },
    [microphone.track, persist],
  );

  const stopPreview = useCallback(() => {
    // Bumping both generations abandons any acquisition still in flight, so a
    // track that resolves after this point is stopped on arrival rather than
    // being adopted into a lobby that has already handed off.
    generation.current.camera += 1;
    generation.current.microphone += 1;

    for (const track of openTracks.current) track.stop();
    openTracks.current.clear();

    setCamera((state) => ({ ...state, track: null, busy: false }));
    setMicrophone((state) => ({ ...state, track: null, busy: false }));
  }, []);

  return {
    camera,
    microphone,
    blockingFailure,
    devices,
    setCameraEnabled,
    setMicrophoneEnabled,
    selectCamera,
    selectMicrophone,
    stopPreview,
  };
}
