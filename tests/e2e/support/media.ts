import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Well-formed and in the room-code alphabet, but never inserted. */
export const UNKNOWN_CODE = 'zzz-zzzz-zzz';
/** `i` and `0` are outside the alphabet, so this cannot be a real code. */
export const MALFORMED_CODE = 'abc-0i23-xyz';

export const MOBILE = { width: 360, height: 740 };
export const MIN_HIT_AREA = 44;

export async function createMeeting(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/meetings');
  expect(response.status()).toBe(201);

  const { code } = (await response.json()) as { code: string };
  return code;
}

/**
 * Records every track the page opens, so a leaked one is visible after the fact.
 * Installed before any script runs, because the lobby asks for media on mount.
 */
export async function trackMediaAcquisition(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const opened: MediaStreamTrack[] = [];
    Object.defineProperty(window, '__openedTracks', { value: opened });

    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      opened.push(...stream.getTracks());
      return stream;
    };
  });
}

export function liveTrackCounts(page: Page): Promise<{ video: number; audio: number }> {
  return page.evaluate(() => {
    const opened = (window as unknown as { __openedTracks: MediaStreamTrack[] }).__openedTracks;
    const live = opened.filter((track) => track.readyState === 'live');
    return {
      video: live.filter((track) => track.kind === 'video').length,
      audio: live.filter((track) => track.kind === 'audio').length,
    };
  });
}

/**
 * Replaces the browser's screen-share picker with a canvas the page paints itself.
 *
 * Only the picker is stubbed. LiveKit still publishes a real `MediaStreamTrack`,
 * the SFU still relays it, and the receiving browser still decodes it — so every
 * assertion about what the *other* participant sees is genuine. Chromium cannot
 * be driven through a real OS capture prompt headlessly, and stubbing our own code
 * or the SFU would test the mock instead of the thing that breaks.
 *
 * The most recent track is exposed as `window.__shareTrack` so a test can end it
 * the way Chrome's own "Stop sharing" bar does.
 */
export async function stubDisplayMedia(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // A repainted canvas, not a second getUserMedia. Sourcing the stub from the
    // fake camera device meant two video tracks from the same device in one page,
    // and under parallel load LiveKit published the share and then unpublished it
    // a moment later. The canvas has no device to contend for.
    //
    // Only the picker is replaced. LiveKit still publishes a real track, the SFU
    // still relays it, and the receiving browser still decodes it.
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvas.style.position = 'fixed';
      canvas.style.left = '-10000px';
      document.body.appendChild(canvas);

      const context = canvas.getContext('2d');
      let frame = 0;
      const timer = window.setInterval(() => {
        if (!context) return;
        frame += 1;
        // The fill has to actually change: an unchanged canvas produces one frame
        // and then nothing, and an encoder with no frames is not a live share.
        context.fillStyle = frame % 2 === 0 ? '#1d4ed8' : '#2563eb';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }, 100);

      const stream = canvas.captureStream(10);
      const track = stream.getVideoTracks()[0];
      const target = window as unknown as { __shareTrack?: MediaStreamTrack };
      target.__shareTrack = track;

      if (track) {
        track.addEventListener('ended', () => window.clearInterval(timer));

        // livekit-client clones the track it is handed and stops the original, so
        // the reference a test needs — the one the SDK listens to for `ended` — is
        // the clone. Chasing this the other way cost a debugging pass: a healthy
        // share reads `ended` on whatever came out of the picker.
        const clone = track.clone.bind(track);
        track.clone = () => {
          const cloned = clone();
          target.__shareTrack = cloned;
          return cloned;
        };
      }

      return stream;
    };
  });
}

/** Makes the picker refuse, exactly as it does when someone dismisses it. */
export async function dismissDisplayMedia(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
  });
}

/** A browser that cannot share at all — every mobile one, and this is how we prove it. */
export async function blockDisplayMedia(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Defined on MediaDevices.prototype, not the instance, so `delete` on the
    // instance is a no-op. Shadowing it with undefined is what actually hides it.
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      value: undefined,
      configurable: true,
    });
  });
}

/** Ends the shared track from outside our UI, as Chrome's own stop bar does. */
export function stopShareFromBrowser(page: Page): Promise<void> {
  return page.evaluate(() => {
    const track = (window as unknown as { __shareTrack?: MediaStreamTrack }).__shareTrack;
    if (!track) throw new Error('no shared track to stop — was stubDisplayMedia installed?');

    track.stop();
    // `stop()` deliberately does not fire `ended` on the track that called it,
    // but Chrome does fire it when the user stops the capture from its own bar —
    // and `ended` is what livekit-client listens for to unpublish.
    track.dispatchEvent(new Event('ended'));
  });
}
