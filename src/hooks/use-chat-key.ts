'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { importChatKey, readChatKeyFromHash } from '@/lib/crypto/chat-key';

export type ChatKeyState =
  { status: 'loading' } | { status: 'ready'; key: CryptoKey } | { status: 'missing' };

const LOADING = { status: 'loading' } as const;
const MISSING = { status: 'missing' } as const;

/**
 * Nothing to subscribe to, deliberately.
 *
 * The fragment is read once and never watched: the only thing that rewrites it is
 * `restoreChatKeyFragment()`, which runs in the lobby before this hook exists, and
 * a key that changed mid-call would silently turn everything already in the
 * transcript unreadable.
 */
function subscribe(): () => void {
  return () => {};
}

function encodedKey(): string | null {
  return readChatKeyFromHash(window.location.hash);
}

/**
 * The meeting's chat key, read from the URL fragment and imported for use.
 *
 * The fragment is the only source. It is never fetched, never stored, and never
 * put back on the wire — that is what keeps the key out of the server's reach, and
 * it is why this reads `window.location.hash` directly rather than taking the key
 * as a prop from somewhere that might have serialized it.
 *
 * The imported `CryptoKey` is safe to hold in state: `importChatKey` marks it
 * non-extractable, so it cannot be read back out. The base64url string is never
 * held in state at all.
 *
 * `useSyncExternalStore` for the fragment rather than an effect, the same shape and
 * for the same reason as `use-media-query`: it is a value the server cannot see.
 * Reading it in an effect would mean a synchronous `setState` on mount for the
 * commonest case — a link with no key — which is a second render pass before paint
 * and what `react-hooks/set-state-in-effect` exists to catch. Only the import,
 * which is genuinely asynchronous, goes through state.
 */
export function useChatKey(): ChatKeyState {
  const encoded = useSyncExternalStore(subscribe, encodedKey, () => null);
  const [imported, setImported] = useState<ChatKeyState | null>(null);

  useEffect(() => {
    if (!encoded) return;

    // Per-run, never hoisted: React double-invokes effects in development, and a
    // shared flag lets the first run's cleanup clear what the second run set.
    let cancelled = false;

    // An effect callback cannot itself be async, so the work goes in an IIFE.
    void (async () => {
      try {
        const key = await importChatKey(encoded);
        if (!cancelled) setImported({ status: 'ready', key });
      } catch {
        // A malformed key is indistinguishable from no key to the person holding
        // the link, and the explanation they need is the same one.
        if (!cancelled) setImported(MISSING);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [encoded]);

  if (!encoded) return MISSING;

  return imported ?? LOADING;
}
