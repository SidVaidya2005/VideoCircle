import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SectionOverline } from '@/components/ui/section-overline';

/**
 * Shown both to someone with no history and after a failed query.
 *
 * Deliberately the same surface for both. A person who has never made a call and a
 * person whose query just failed both need the same thing — a way to start one —
 * and inventing an error state would mean explaining a database problem to someone
 * who cannot act on it. The failure is logged server-side, where it can be.
 *
 * The grid backdrop is allowed here: it belongs on Home, the lobby, and empty
 * states, and is barred only from live video. No illustration, per the brand.
 */
export function HistoryEmpty() {
  return (
    <div className="bg-card border-line/60 grid-backdrop flex flex-col items-center gap-4 rounded-lg border px-6 py-16 text-center">
      <SectionOverline>Nothing yet</SectionOverline>
      <p className="text-ink-2 max-w-md text-sm leading-normal">
        Meetings you join show up here — when they were, how long you were in them, and who else was
        there.
      </p>
      <Button asChild size="sm">
        <Link href="/">Start a meeting</Link>
      </Button>
    </div>
  );
}
