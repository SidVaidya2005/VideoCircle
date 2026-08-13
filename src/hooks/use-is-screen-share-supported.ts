'use client';

import { useSyncExternalStore } from 'react';

/** The capability cannot change for the life of the page, so nothing to subscribe to. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

/** The server has no `navigator`, and rendering the control there would flash it away. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Whether this browser can share a screen at all.
 *
 * No mobile browser implements `getDisplayMedia` — not iOS Safari, not Chrome,
 * Firefox, Samsung Internet or Opera on Android — so on a phone the control is
 * absent rather than disabled. A permanently dead button that can never work on
 * this device is noise, and it invites a tap that can only disappoint.
 *
 * `useSyncExternalStore` rather than an effect that sets state: the room tree is
 * server-rendered even though it is a Client Component, and this is exactly the
 * shape React provides for a value the server cannot see. Reading it in an effect
 * would mean a render pass whose only job is to correct the first one.
 *
 * The presence check is necessary but not sufficient. Chrome Android 72–88 and
 * Firefox Android 66–79 exposed the method and always rejected — so the call
 * itself is wrapped in try/catch regardless of what this returns.
 */
export function useIsScreenShareSupported(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
