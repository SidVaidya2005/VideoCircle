'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SectionOverline } from '@/components/ui/section-overline';

interface JoinFailureNoticeProps {
  code: string;
  message: string;
  onRetry: () => void;
}

/**
 * Failures where trying again cannot possibly help.
 *
 * The meeting is gone, or was never there — a retry button would invite someone
 * to press it until they gave up. These get a way to start a new meeting instead,
 * which is the only thing left to do.
 */
const FINAL = new Set(['not_found', 'meeting_ended', 'meeting_expired']);

const HEADLINE: Record<string, string> = {
  not_found: 'No such meeting',
  meeting_ended: 'This meeting has ended',
  meeting_expired: 'This link has expired',
};

export function JoinFailureNotice({ code, message, onRetry }: JoinFailureNoticeProps) {
  const final = FINAL.has(code);

  return (
    <div
      role="alert"
      className="border-line/60 bg-card flex flex-col gap-3 rounded-lg border p-5 text-left"
    >
      <SectionOverline>{HEADLINE[code] ?? 'Could not join'}</SectionOverline>
      <p className="text-ink-2 text-sm leading-normal">{message}</p>

      {final ? (
        <Button asChild variant="outline">
          <Link href="/">Start a new meeting</Link>
        </Button>
      ) : (
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
