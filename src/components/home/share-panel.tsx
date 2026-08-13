'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionOverline } from '@/components/ui/section-overline';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { env } from '@/lib/env';

interface SharePanelProps {
  code: string;
  /** The exported chat key. Client state only — it never crosses a server boundary. */
  chatKey: string;
}

const COPY_FAILED = 'Could not reach the clipboard. The link is selected — copy it by hand.';

export function SharePanel({ code, chatKey }: SharePanelProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLInputElement>(null);
  const { copied, failed: copyFailed, copy } = useCopyToClipboard();

  // Both derived here so the link that gets copied and the one that gets navigated
  // to cannot drift apart. Built from NEXT_PUBLIC_SITE_URL rather than
  // window.location.origin, so the link handed to someone else names the canonical
  // origin even if the creator reached the app on another host.
  const roomPath = `/room/${code}#k=${chatKey}`;
  const shareLink = `${env.NEXT_PUBLIC_SITE_URL}${roomPath}`;

  // Select the text when the clipboard could not be reached, so the manual path
  // is one keystroke. The hook owns whether it failed; this owns the recovery.
  useEffect(() => {
    if (copyFailed) linkRef.current?.select();
  }, [copyFailed]);

  return (
    <div className="border-line/60 bg-card flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 text-left">
      <SectionOverline>Meeting ready</SectionOverline>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={linkRef}
          readOnly
          value={shareLink}
          aria-label="Meeting share link"
          onFocus={(event) => event.currentTarget.select()}
          className="sm:flex-1"
        />
        <Button type="button" onClick={() => copy(shareLink)} className="sm:flex-none">
          {copied ? 'COPIED' : 'COPY'}
        </Button>
      </div>

      {/* Success is announced politely — the button's own label change is easy to
          miss. Failure is an alert, matching every other control here that fails in
          response to something the user just did. */}
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'Link copied to the clipboard.' : ''}
      </p>

      {copyFailed ? (
        <p role="alert" className="text-ink-2 text-xs leading-normal">
          {COPY_FAILED}
        </p>
      ) : null}

      <p className="text-ink-2 text-xs leading-normal">
        This link carries the chat key after the <code className="text-ink">#</code>. Send it as
        plain text — a shortener rewrites the link and drops that part, and chat silently stops
        working for whoever opens it.
      </p>

      <p className="text-faint text-xs leading-normal">
        A first visit after an idle spell can take about a minute to load.
      </p>

      <Button type="button" onClick={() => router.push(roomPath)}>
        JOIN NOW
      </Button>
    </div>
  );
}
