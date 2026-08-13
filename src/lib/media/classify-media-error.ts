import { MediaDeviceFailure } from 'livekit-client';

/**
 * Why the browser would not hand over a camera or microphone.
 *
 * `error` is the catch-all, and it covers two distinct cases on purpose: an error
 * the SDK classifies as `Other` (an unsatisfiable constraint, say), and a thrown
 * value with no `name` property at all — for that one `getFailure` returns
 * `undefined` rather than `Other`, so both have to land in the same default.
 *
 * `timeout` is the one member `classifyMediaError` never returns: a request that
 * hangs produces no error to classify. It is raised by the caller that gave up
 * waiting — see `use-media-preview.ts`.
 */
export type MediaFailure = 'denied' | 'no-device' | 'in-use' | 'timeout' | 'error';

/**
 * Classifies a `createLocalTracks` rejection into a state the lobby can render.
 *
 * Delegates to the SDK rather than reading `error.name` here: LiveKit already maps
 * both the modern and legacy spellings of each DOMException (`NotFoundError` and
 * `DevicesNotFoundError`, `NotAllowedError` and `PermissionDeniedError`,
 * `NotReadableError` and `TrackStartError`), and duplicating that list would let it
 * drift the first time a browser adds one.
 */
export function classifyMediaError(error: unknown): MediaFailure {
  // `getFailure` tests `'name' in error`, and the `in` operator throws a
  // TypeError on a primitive or on null. `throw 'string'` is legal JavaScript and
  // does reach here from third-party code, so without this guard the classifier
  // itself throws and the lobby sits on "requesting" forever — the one outcome a
  // failure path must never produce.
  if (typeof error !== 'object' || error === null) {
    return 'error';
  }

  switch (MediaDeviceFailure.getFailure(error)) {
    case MediaDeviceFailure.PermissionDenied:
      return 'denied';
    case MediaDeviceFailure.NotFound:
      return 'no-device';
    // Another application is holding the device — a laptop that has just left a
    // call in another app is the everyday case. It must not be reported as a
    // missing device: that sends someone looking for a hardware fault when the
    // fix is closing one window.
    case MediaDeviceFailure.DeviceInUse:
      return 'in-use';
    default:
      return 'error';
  }
}
