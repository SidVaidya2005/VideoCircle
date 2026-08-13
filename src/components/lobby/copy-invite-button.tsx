'use client';

import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { env } from '@/lib/env';
import { buildInviteLink } from '@/lib/invite-link';

interface CopyInviteButtonProps {
  code: string;
}

const COPY_FAILED = 'Could not reach the clipboard. Copy the link from the address bar instead.';

export function CopyInviteButton({ code }: CopyInviteButtonProps) {
  const { copied, failed, copy } = useCopyToClipboard();

  /**
   * Read at click time, not held in state: `window` is unavailable during the
   * server render, and a fragment captured on mount would go stale if it changed.
   *
   * The fragment is carried verbatim and never parsed — this component has no
   * business knowing there is a key in it. Built from `NEXT_PUBLIC_SITE_URL`
   * rather than `window.location.origin`, so a link handed to someone else names
   * the canonical origin even if this person reached the app on another host.
   */
  function shareLink(): string {
    return buildInviteLink(env.NEXT_PUBLIC_SITE_URL, code, window.location.hash);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={() => copy(shareLink())} className="w-full">
        {copied ? 'Link copied' : 'Copy invite link'}
      </Button>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'Invite link copied to the clipboard.' : ''}
      </p>

      {failed ? (
        <p role="alert" className="text-ink-2 text-xs leading-normal">
          {COPY_FAILED}
        </p>
      ) : null}
    </div>
  );
}
