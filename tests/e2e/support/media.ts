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
