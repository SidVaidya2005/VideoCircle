'use client';

import { useSyncExternalStore } from 'react';

interface HistoryTimeProps {
  /** ISO 8601, straight from Postgres. */
  at: string;
  className?: string;
}

const FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

/** Nothing to subscribe to: hydration happens once and never reverses. */
function subscribe(): () => void {
  return () => {};
}

/**
 * Whether we are past hydration, and therefore in the reader's own environment.
 *
 * Module-private because it has exactly one caller. `use-media-query.ts` is the
 * same shape for the same reason — a value the server cannot know, delivered
 * through `useSyncExternalStore` rather than an effect, since a synchronous
 * `setState` in an effect body is a lint error in this project.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * A meeting's start, in the reader's own timezone.
 *
 * **A Client Component for one reason: `Intl` on the server formats in the
 * server's zone.** On Render that is UTC, so a purely server-rendered timestamp
 * would tell someone in Mumbai that their 19:30 call happened at 14:00. Every other
 * page here renders entirely on the server; a history of *when* things happened
 * cannot.
 *
 * **`suppressHydrationWarning` does not solve this, and was tried.** It suppresses
 * the warning by keeping the server's text — so the page kept rendering the server's
 * zone and the bug survived silently. The fix has to make the client genuinely
 * re-render, which is what the hydration flag above does: UTC on the server pass and
 * during hydration, the reader's zone immediately after. `tests/e2e/history.spec.ts`
 * pins it by loading the page under a UTC+14 browser and asserting the rendered text
 * is neither the server's zone nor UTC.
 *
 * UTC is the server-side value rather than a blank, so the markup a crawler or a
 * JS-less reader sees still names the right instant — in the wrong zone, but
 * labelled by `dateTime`, which is unambiguous either way.
 */
export function HistoryTime({ at, className }: HistoryTimeProps) {
  const hydrated = useIsHydrated();
  const date = new Date(at);

  return (
    <time dateTime={at} className={className}>
      {date.toLocaleString(undefined, hydrated ? FORMAT : { ...FORMAT, timeZone: 'UTC' })}
    </time>
  );
}
