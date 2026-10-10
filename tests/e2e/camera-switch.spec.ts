import { expect, test, type Page } from '@playwright/test';

import { expectMirrored, expectRearFrames, stubPhoneCameras } from './support/cameras';
import { connectedStatus, joinAs } from './support/join';
import { createMeeting, liveTrackCounts, MOBILE, trackMediaAcquisition } from './support/media';

const camera = (page: Page) => page.getByRole('button', { name: /^turn (on|off) camera$/i });
const localVideo = (page: Page) => page.getByRole('listitem').first().locator('video');

async function switchCamera(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'More options' }).click();
  const action = page.getByRole('menuitem', { name: 'Switch camera', exact: true });
  await expect(action).toBeVisible();
  await expect
    .poll(async () => (await action.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await action.click();
}

test('lobby mirroring follows front and rear capture after a track restart', async ({
  page,
  request,
}) => {
  await stubPhoneCameras(page);
  const code = await createMeeting(request);
  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expectMirrored(page.locator('video'), true);
  await page.getByLabel('Camera', { exact: true }).selectOption('lens-b');
  await expectMirrored(page.locator('video'), false);
  await page.getByLabel('Camera', { exact: true }).selectOption('lens-a');
  await expectMirrored(page.locator('video'), true);
});

test('a rear camera chosen in the lobby stays unmirrored after joining', async ({
  page,
  request,
}) => {
  await stubPhoneCameras(page);
  const code = await createMeeting(request);
  await page.goto(`/room/${code}`);
  await page.getByLabel('Camera', { exact: true }).selectOption('lens-b');
  await expectMirrored(page.locator('video'), false);
  await page.getByLabel('Your name').fill('Ada');
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(connectedStatus(page)).toBeVisible({ timeout: 30_000 });
  await expectMirrored(localVideo(page), false);
});

test('mobile switching keeps the call and microphone live and sends unflipped rear frames', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page);
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const peer = await second.newPage();
  await stubPhoneCameras(peer, 1);
  try {
    await joinAs(page, code, 'Ada');
    await joinAs(peer, code, 'Grace');
    await expect(peer.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });
    const remoteVideo = peer.getByRole('listitem').nth(1).locator('video');
    await expect(peer.locator('audio')).toHaveCount(1, { timeout: 15_000 });
    const remoteAudioId = await peer.locator('audio').evaluate((element: HTMLAudioElement) => {
      return element.srcObject instanceof MediaStream
        ? element.srcObject.getAudioTracks()[0]?.id
        : undefined;
    });
    expect(remoteAudioId).toBeTruthy();
    await expectMirrored(localVideo(page), true);
    const audioId = await page.evaluate(() => {
      const tracks = (window as unknown as { __openedTracks: MediaStreamTrack[] }).__openedTracks;
      return tracks.find((track) => track.kind === 'audio' && track.readyState === 'live')?.id;
    });
    expect(audioId).toBeTruthy();
    const url = page.url();

    await switchCamera(page);
    await expectMirrored(localVideo(page), false);
    await expectRearFrames(remoteVideo);
    await expectMirrored(remoteVideo, false);
    await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
    expect(
      await page.evaluate((id) => {
        const tracks = (window as unknown as { __openedTracks: MediaStreamTrack[] }).__openedTracks;
        return tracks.some((track) => track.id === id && track.readyState === 'live');
      }, audioId),
    ).toBe(true);
    await expect(connectedStatus(page)).toBeVisible();
    expect(
      await peer.locator('audio').evaluate((element: HTMLAudioElement) => {
        return element.srcObject instanceof MediaStream
          ? element.srcObject.getAudioTracks()[0]?.id
          : undefined;
      }),
    ).toBe(remoteAudioId);
    expect(page.url()).toBe(url);

    await switchCamera(page);
    await expectMirrored(localVideo(page), true);
    await camera(page).click();
    await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
    await switchCamera(page);
    await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
    await camera(page).click();
    await expectMirrored(localVideo(page), false);
    await expectRearFrames(remoteVideo);
  } finally {
    await second.close();
  }
});

test('joining camera-off allows selecting a lens without starting capture', async ({
  page,
  request,
}) => {
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page);
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await page.getByRole('button', { name: 'Camera on', exact: true }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(connectedStatus(page)).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await switchCamera(page);
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await camera(page).click();
  await expectMirrored(localVideo(page), false);
  await expectRearFrames(localVideo(page));
});

test('switching twice while camera-off cycles back to the original lens', async ({
  page,
  request,
}) => {
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page);
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  await camera(page).click();
  await switchCamera(page);
  await switchCamera(page);
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await camera(page).click();
  await expectMirrored(localVideo(page), true);
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
});

test('an unavailable lens restores the working camera and preserves off/on', async ({
  page,
  request,
}) => {
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page);
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  await page.evaluate(() => {
    (window as unknown as { __unavailableCamera: string }).__unavailableCamera = 'lens-b';
  });
  await switchCamera(page);
  await expect(
    page.getByRole('status').filter({ hasText: /could not switch camera/i }),
  ).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
  await expectMirrored(localVideo(page), true);
  await camera(page).click();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await camera(page).click();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
  await expectMirrored(localVideo(page), true);
  await expect(connectedStatus(page)).toBeVisible();
});

test('a failed switch is explained and can be retried', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  await page.evaluate(() => {
    (window as unknown as { __cameraFailure: boolean }).__cameraFailure = true;
  });
  await switchCamera(page);
  await expect(
    page.getByRole('status').filter({ hasText: /could not switch camera/i }),
  ).toBeVisible();
  await expect(connectedStatus(page)).toBeVisible();
  await switchCamera(page);
  await expectMirrored(localVideo(page), false);
  await expect(
    page.getByRole('status').filter({ hasText: /could not switch camera/i }),
  ).toHaveCount(0);
});

test('a camera switch disables repeated switches and camera toggles until it finishes', async ({
  page,
  request,
}) => {
  await stubPhoneCameras(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  await page.evaluate(() => {
    (window as unknown as { __cameraDelay: number }).__cameraDelay = 1500;
  });
  const button = page.getByRole('button', { name: 'Switch camera', exact: true });
  await button.click();
  await expect(button).toBeDisabled();
  await expect(camera(page)).toBeDisabled();
  await page.keyboard.press('e');
  await expect(camera(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toBeEnabled();
  await expectMirrored(localVideo(page), false);
});

test('a stalled switch releases controls, turns the camera off and stops late capture', async ({
  page,
  request,
}) => {
  await stubPhoneCameras(page);
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  const openedBefore = await page.evaluate(() => {
    return (window as unknown as { __openedTracks: MediaStreamTrack[] }).__openedTracks.length;
  });
  await page.evaluate(() => {
    (window as unknown as { __cameraDelay: number }).__cameraDelay = 10_000;
  });
  const button = page.getByRole('button', { name: 'Switch camera', exact: true });
  await button.click();
  await expect(page.getByRole('status').filter({ hasText: /switch timed out/i })).toBeVisible({
    timeout: 9500,
  });
  await expect(button).toBeEnabled();
  await expect(camera(page)).toHaveAccessibleName('Turn on camera');
  await expect
    .poll(() =>
      page.evaluate(() => {
        return (window as unknown as { __openedTracks: MediaStreamTrack[] }).__openedTracks.length;
      }),
    )
    .toBeGreaterThan(openedBefore);
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await page.evaluate(() => {
    (window as unknown as { __cameraDelay: number }).__cameraDelay = 0;
  });
  await camera(page).click();
  await expectMirrored(localVideo(page), true);
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
});

test('a browser with one camera has no switch action', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  await stubPhoneCameras(page, 1);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada');
  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Switch camera', exact: true })).toHaveCount(0);
});
