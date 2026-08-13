'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

interface InviteDialogProps {
  /** Built by the caller in its click handler, where reading `window` belongs. */
  link: string;
  /** Whether that link carries a chat key. Presence only — never the value. */
  hasKey: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WITH_KEY =
  'This link carries the chat key. Anyone you send it to can join and read the chat, so send it the way you would send the meeting itself.';
const WITHOUT_KEY =
  'This link has no chat key, so whoever opens it can join the call but will not be able to read chat. Copy the original link you were sent if you have it.';
const COPY_FAILED = 'Could not reach the clipboard. The link is selected — copy it directly.';

/**
 * The invite link, shown rather than only copied.
 *
 * Purely presentational: the caller builds the link in the handler that opens
 * this, because that is an event handler, which is where reading `window` is
 * allowed. Doing it here meant an effect whose only job was to set state on open,
 * which is a render pass spent correcting the previous one.
 */
export function InviteDialog({ link, hasKey, open, onOpenChange }: InviteDialogProps) {
  const { copied, failed, copy } = useCopyToClipboard();
  const fieldRef = useRef<HTMLInputElement>(null);

  // Selected the moment the automatic copy fails, so the manual path is one
  // keystroke rather than a drag across a long URL on a phone.
  useEffect(() => {
    if (failed) fieldRef.current?.select();
  }, [failed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite others</DialogTitle>
          <DialogDescription>{hasKey ? WITH_KEY : WITHOUT_KEY}</DialogDescription>
        </DialogHeader>

        <Input
          ref={fieldRef}
          readOnly
          value={link}
          aria-label="Invite link"
          onFocus={(event) => event.currentTarget.select()}
          className="text-xs"
        />

        <Button type="button" onClick={() => void copy(link)}>
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
      </DialogContent>
    </Dialog>
  );
}
