'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SectionOverline } from '@/components/ui/section-overline';
import { describeDisconnect } from '@/lib/livekit/disconnect-reason';

import type { DisconnectReason } from 'livekit-client';

interface DisconnectNoticeProps {
  /** Undefined is a real case: the SDK does not always give a reason. */
  reason: DisconnectReason | undefined;
}

/**
 * The call ended and nobody here chose it.
 *
 * Until F23 every disconnect pushed Home, so a dropped call and a pressed Leave
 * were indistinguishable — you were simply on the landing page, with no way to
 * tell whether you had left or been dropped, and no way back except finding the
 * link again.
 *
 * Deliberately shaped like `JoinFailureNotice`: same card, same overline, same
 * split between a retry and a way onward. A person who has had one call fail
 * should not have to learn a second layout to read about the next.
 *
 * **Rejoin reloads rather than re-entering the lobby in state.** `stopPreview()`
 * bumps the media hook's acquisition generations and its acquiring effect runs on
 * mount, so setting the lobby phase again renders a lobby whose camera preview is
 * permanently dead. A reload keeps the `#k=` fragment — which is the chat key and
 * the one thing that must survive — re-runs the server-side meeting lookup, and
 * re-acquires media by the ordinary first-visit path, rather than adding a restart
 * route through the most intricate hook in the project.
 */
export function DisconnectNotice({ reason }: DisconnectNoticeProps) {
  const { title, message, rejoinable } = describeDisconnect(reason);

  return (
    <div
      // Assertive, unlike the lobby's media notices: those resolve on their own a
      // moment after the page opens, while this one means the call is over and the
      // person is looking at a screen that stopped changing.
      role="alert"
      aria-live="assertive"
      className="border-line/60 bg-card mx-auto flex w-full max-w-md flex-col gap-3 rounded-lg border p-5 text-left"
    >
      <SectionOverline>{title}</SectionOverline>
      <p className="text-ink-2 text-sm leading-normal">{message}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {rejoinable ? (
          <Button type="button" onClick={() => window.location.reload()}>
            Rejoin
          </Button>
        ) : null}

        <Button asChild variant="outline">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
