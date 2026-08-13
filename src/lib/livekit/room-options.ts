import type { RoomOptions } from 'livekit-client';

/**
 * Room configuration, carrying the device choices made in the lobby.
 *
 * **Both flags default to `false` in `livekit-client`,** and `<LiveKitRoom>` does
 * not override them — it passes `options` straight to `new Room(options)`. Omit
 * them and the grid silently takes the slow path: twelve 200px tiles each
 * receiving and decoding a full-resolution stream.
 *
 * A factory rather than a constant, because the device ids are chosen at runtime.
 * The **caller must memoise the result** — `<LiveKitRoom>` re-creates its `Room`
 * whenever this object's identity changes, so a fresh literal on every render
 * reconnects the call continuously, which presents as a network fault rather than
 * a code one.
 */
export function roomOptions(devices: { cameraId?: string; microphoneId?: string }): RoomOptions {
  return {
    // Subscribes at a resolution matched to the element the track is attached to,
    // and pauses tracks that are not visible. The single largest performance lever
    // in the product.
    adaptiveStream: true,
    // Pauses publishing simulcast layers no subscriber is consuming, cutting
    // upload bandwidth and encoder CPU on the sending side.
    dynacast: true,
    videoCaptureDefaults: { deviceId: devices.cameraId },
    audioCaptureDefaults: { deviceId: devices.microphoneId },
  };
}
