'use client';

import {
  createLocalTracks,
  Track,
  type CreateLocalTracksOptions,
  type LocalAudioTrack,
  type LocalTrack,
  type LocalVideoTrack,
} from 'livekit-client';
import { useEffect, useState } from 'react';

import { classifyMediaError, type MediaFailure } from '@/lib/media/classify-media-error';

/**
 * The lobby's view of the local devices.
 *
 * `ready` covers partial success as well as full: a participant with a working
 * microphone and a dead webcam is ready, with `cameraFailure` set. The five
 * terminal statuses mean *both* devices failed.
 */
export type MediaPreviewState =
  // No `idle`: the hook asks for the devices on mount, so there is no moment at
  // which a mounted lobby is not yet requesting them. A state nothing can produce
  // is a branch every reader has to rule out by hand.
  | { status: 'requesting' }
  | {
      status: 'ready';
      video: LocalVideoTrack | null;
      audio: LocalAudioTrack | null;
      cameraFailure: MediaFailure | null;
      micFailure: MediaFailure | null;
    }
  | { status: 'denied' }
  | { status: 'no-device' }
  | { status: 'in-use' }
  | { status: 'timeout' }
  | { status: 'error' };

interface Acquisition {
  state: MediaPreviewState;
  /** Only the tracks opened by this step — the caller accumulates them. */
  tracks: LocalTrack[];
}

/**
 * How long to wait for a device that cannot be waiting on a person.
 *
 * `getUserMedia` is not guaranteed to settle: it can hang indefinitely rather
 * than reject. Reproduced on the development machine, where an audio request
 * never returned while the camera on the same machine opened normally. A promise
 * that never settles leaves the lobby on "waiting" forever, which is the one
 * outcome a failure path must never produce.
 *
 * This timer is only ever started once permission is known to be granted — see
 * `permissionAlreadyGranted`. While a permission prompt may still be open the
 * request is waiting on a human, and no timeout applies: someone who takes
 * fifteen seconds to find the Allow button has not experienced a failure.
 */
const ACQUIRE_TIMEOUT_MS = 8_000;

/**
 * TypeScript's `PermissionName` omits `camera` and `microphone`, although both
 * are in the Permissions API registry and queryable in Chromium. Narrow local
 * type, declared once, rather than a cast at each call site.
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

async function acquireOne(
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
 * Asks for the devices, and works out what actually failed if something did.
 *
 * Two paths, because the right shape depends on whether a permission prompt is
 * still possible:
 *
 * - **Permission already granted** — ask for each device separately and in
 *   parallel. No prompt can appear, so there is no double-prompt to avoid, each
 *   request can carry a timeout, and a microphone that hangs costs nothing: the
 *   camera still arrives on time.
 * - **Permission not yet decided** — one combined request, untimed, so the
 *   browser raises a single prompt covering both devices and the person answers
 *   at their own pace. Only if that fails for a reason other than refusal is it
 *   worth asking per device, and by then permission is settled, so those retries
 *   are timed.
 *
 * `publish` is called as results land rather than once at the end, so a working
 * camera appears immediately instead of waiting behind a hanging microphone. It
 * receives only newly opened tracks; the caller accumulates them for cleanup.
 */
async function acquirePreview(publish: (acquisition: Acquisition) => void): Promise<void> {
  const granted = await permissionAlreadyGranted();

  if (!granted) {
    const combined = await acquireOne({ audio: true, video: true }, false);

    if (!combined.failure) {
      publish({
        tracks: combined.tracks,
        state: {
          status: 'ready',
          video: findVideo(combined.tracks),
          audio: findAudio(combined.tracks),
          cameraFailure: null,
          micFailure: null,
        },
      });
      return;
    }

    // A refusal already covers both devices, and asking again only re-prompts
    // someone who has just said no.
    if (combined.failure === 'denied') {
      publish({ tracks: [], state: { status: 'denied' } });
      return;
    }
  }

  // Per-device, either because permission was already settled or because the
  // combined request failed for a reason worth pinning down. The combined form is
  // all-or-nothing in a way that hides the truth: one dead camera sinks it and
  // takes a perfectly good microphone down too.
  const cameraRequest = acquireOne({ video: true }, true);
  const micRequest = acquireOne({ audio: true }, true);

  const camera = await cameraRequest;
  if (camera.tracks.length > 0) {
    // Published before the microphone settles — that is the whole point of not
    // awaiting both together.
    publish({
      tracks: camera.tracks,
      state: {
        status: 'ready',
        video: findVideo(camera.tracks),
        audio: null,
        cameraFailure: null,
        micFailure: null,
      },
    });
  }

  const mic = await micRequest;

  if (camera.tracks.length === 0 && mic.tracks.length === 0) {
    // Both failed. The camera's reason leads, since the preview is the visible
    // half of this screen.
    publish({ tracks: [], state: { status: camera.failure ?? mic.failure ?? 'error' } });
    return;
  }

  publish({
    tracks: mic.tracks,
    state: {
      status: 'ready',
      video: findVideo(camera.tracks),
      audio: findAudio(mic.tracks),
      cameraFailure: camera.failure,
      micFailure: mic.failure,
    },
  });
}

/**
 * Acquires the lobby's preview tracks, and releases them on unmount.
 *
 * The tracks are owned here for the whole life of the lobby. Nothing else may
 * stop them, and nothing may hand them to a room in this feature — there is no
 * room yet.
 */
export function useMediaPreview(): MediaPreviewState {
  const [state, setState] = useState<MediaPreviewState>({ status: 'requesting' });

  useEffect(() => {
    let cancelled = false;
    const acquired: LocalTrack[] = [];

    void (async () => {
      await acquirePreview(({ state: next, tracks }) => {
        acquired.push(...tracks);

        if (cancelled) {
          // React double-invokes effects in development, and the first run's
          // teardown fires while its request is still in flight — so by the time
          // these tracks exist, the cleanup that would have stopped them has
          // already run. Stopping them here is what keeps the camera light from
          // staying on after the lobby is gone.
          for (const track of tracks) track.stop();
          return;
        }

        setState(next);
      });
    })();

    return () => {
      cancelled = true;
      for (const track of acquired) track.stop();
    };
  }, []);

  return state;
}
