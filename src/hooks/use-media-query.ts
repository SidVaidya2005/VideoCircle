'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches.
 *
 * **Use CSS wherever CSS can do the job.** Everything responsive in this project
 * is a Tailwind variant precisely so nothing measures the viewport inside the call
 * tree. This exists for the one case CSS cannot cover: a Radix dialog traps focus,
 * locks body scroll and marks the rest of the page `aria-hidden` the moment it
 * opens, and none of that can be undone with a `lg:hidden` class — especially not
 * on content Radix has portaled out to `document.body`. Rendering the sheet at all
 * on a desktop layout is what has to be avoided, so the decision has to be real.
 *
 * `useSyncExternalStore` rather than an effect: the room tree is server-rendered
 * despite being a Client Component, and this is the shape React provides for a
 * value the server cannot see. The server snapshot is `false`, so the server
 * renders the mobile form — mobile-first, and the panel only mounts after a click
 * long past hydration, so nothing flashes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
