import type { MediaFailure } from '@/lib/media/classify-media-error';

/**
 * Copy for each way the devices can fail.
 *
 * None of it names a browser API, an error code, or a provider, and none of it
 * dead-ends: every entry says what to do next. `hint` carries the recovery steps,
 * which are the part people actually need and the part a generic error toast
 * always leaves out.
 *
 * **Here rather than inside `media-state-notice.tsx`, where it used to live,
 * because three of these five states are unreachable from the e2e suite.**
 * `--use-fake-ui-for-media-stream` auto-grants and the fake device is always
 * present, so `denied`, `no-device` and `in-use` cannot be rendered by a test —
 * which means a unit test is the only thing that can check them, and a unit test
 * needs the map somewhere importable without rendering React. The same split the
 * project makes for `disconnect-reason.ts`.
 */

export interface MediaFailureCopy {
  title: string;
  body: string;
  hint: string;
}

export const MEDIA_FAILURE_COPY: Record<MediaFailure, MediaFailureCopy> = {
  denied: {
    title: 'Camera and microphone are blocked',
    body: 'Your browser is holding on to that choice, so nothing on this page can reach them until it changes.',
    hint: 'On a computer, open the padlock or camera icon in the address bar, set Camera and Microphone to Allow, then reload. On iPhone or iPad, open Settings, then Safari, then Camera and Microphone.',
  },
  'no-device': {
    title: 'No camera or microphone found',
    body: 'Nothing is connected that the browser can see. You can still take part — you just will not be seen or heard.',
    hint: 'If something is plugged in, check it is not switched off in your system settings, then reload.',
  },
  'in-use': {
    title: 'Another app is using your camera',
    body: 'Only one application can hold a camera or microphone at a time.',
    hint: 'Close the other call or recording window, then reload this page.',
  },
  timeout: {
    title: 'Your camera or microphone did not respond',
    body: 'The request was made but nothing came back, which usually means a driver or another app is holding it open.',
    hint: 'Reload the page. If it happens again, close any other app that uses the device, or unplug and reconnect it.',
  },
  error: {
    title: 'Could not start your camera or microphone',
    body: 'Something stopped the browser from reaching them.',
    hint: 'Reload the page. If it keeps happening, try a different browser.',
  },
};
