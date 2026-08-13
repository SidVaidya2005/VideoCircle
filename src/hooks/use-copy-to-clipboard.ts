'use client';

import { useEffect, useState } from 'react';

import { COPIED_RESET_MS } from '@/lib/constants';

/**
 * `navigator.clipboard.writeText` can hang instead of rejecting — observed on a
 * trusted click, in a secure context, with permission already granted, where the
 * promise simply never settled. Awaiting it forever leaves a copy button showing
 * neither success nor failure, which is the one outcome such a control must never
 * produce. A slow clipboard is indistinguishable from a broken one, so both are
 * treated the same and fall through to manual copy.
 */
const COPY_TIMEOUT_MS = 1_500;

export interface CopyToClipboard {
  copied: boolean;
  failed: boolean;
  copy: (text: string) => Promise<void>;
}

export function useCopyToClipboard(): CopyToClipboard {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(text: string): Promise<void> {
    setFailed(false);

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Clipboard write timed out')), COPY_TIMEOUT_MS);
      });

      await Promise.race([navigator.clipboard.writeText(text), timeout]);
      setCopied(true);
    } catch {
      // Refused, unavailable, or hung. A control that says COPIED when nothing
      // was copied is worse than one that admits it.
      setFailed(true);
    } finally {
      clearTimeout(timer);
    }
  }

  return { copied, failed, copy };
}
