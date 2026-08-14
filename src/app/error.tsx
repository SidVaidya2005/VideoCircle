'use client'; // Error boundaries must be Client Components.

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  /**
   * Next 16's recommended recovery: re-fetches and re-renders the boundary's
   * children, so a page that failed on a transient server error can actually come
   * back. `reset()` — which older App Router code reaches for, and which this
   * would have used if written from memory — only clears the error state and
   * re-renders what it already had, which recovers nothing when the cause was the
   * fetch. See `node_modules/next/dist/docs/.../error.md`.
   */
  retry: () => void;
}

/**
 * The root error boundary.
 *
 * Wraps every route's `page`, `loading` and `not-found`, but NOT the root layout
 * above it — that is `global-error.tsx`'s job, which is why both exist.
 *
 * **Nothing about the error reaches the screen.** `error.message` is the real
 * message for a Client Component error, and `digest` is a hash that means
 * something only against server logs; `code-standards.md` → Error Handling says a
 * user-facing message carries no code, stack, or provider name, and a digest is
 * all three problems in one string. It goes to the console, where the developer
 * is, and the person gets a way forward instead.
 */
export default function GlobalRouteError({ error, retry }: ErrorProps) {
  useEffect(() => {
    // The one place it is useful: matches the server-side log line by digest.
    console.error('[app] unhandled render error', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 text-left">
        <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
          {/* The one non-Leave use of signal outside a call: this is the page
              telling you it broke, which is the closest a static surface gets to
              a destructive state. */}
          <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
          Something went wrong
        </p>

        <h1 className="text-ink text-2xl leading-tight">This page could not be loaded.</h1>
        <p className="text-ink-2 text-sm leading-normal">
          The problem may be temporary. Trying again will reload the part of the page that failed.
        </p>

        {/* The same pair, in the same order, as `DisconnectNotice` — one recovery
            and one way onward. Through `Button` rather than hand-rolled classes so
            the two surfaces cannot drift, which is what they had already started
            to do. */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => retry()}>
            Try again
          </Button>

          <Button asChild variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
