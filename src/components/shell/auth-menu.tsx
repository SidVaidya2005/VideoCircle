'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signInWithGoogle } from '@/lib/auth/sign-in';
import { cn } from '@/lib/utils';

interface AuthMenuProps {
  /** Null when signed out. Guests are the normal case, not an error. */
  account: { displayName: string } | null;
}

const SIGN_IN_FAILED = 'Sign-in is unavailable right now. Please try again.';

export function AuthMenu({ account }: AuthMenuProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function startSignIn() {
    setPending(true);
    setFailed(false);

    try {
      // Read in the handler, never at module scope — this component renders on the
      // server first. The fragment is deliberately excluded: `returnTo` becomes a
      // query parameter, and the chat key never travels in one.
      await signInWithGoogle(window.location.pathname + window.location.search);
    } catch (error) {
      console.error('[auth-menu] could not start sign-in', error);
      setFailed(true);
      setPending(false);
    }
    // No success branch: signInWithOAuth navigates the whole page to Google, so
    // reaching one would mean the redirect did not happen.
  }

  if (!account) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="secondary" size="sm" onClick={startSignIn} disabled={pending}>
          {pending ? 'SIGNING IN' : 'SIGN IN'}
        </Button>
        {failed ? (
          // Not `signal` red: that is reserved for Leave and your own muted state.
          <p role="alert" className="text-ink-2 max-w-48 text-right text-xs leading-snug">
            {SIGN_IN_FAILED}
          </p>
        ) : null}
      </div>
    );
  }

  const initial = account.displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${account.displayName}`}
          className={cn(
            'text-ink flex min-h-11 items-center gap-2 rounded-sm pr-2 pl-1',
            'transition-colors duration-(--duration-base) ease-in-out',
            'hover:bg-raised hover:duration-[50ms] hover:ease-out',
            'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
        >
          {/* A typographic initial rather than the Google photo: the brand is type
              and geometry, and it keeps the visitor's browser from calling out to
              googleusercontent.com on every page. */}
          <span
            aria-hidden="true"
            className="border-line/60 bg-raised flex size-9 shrink-0 items-center justify-center rounded-xs border text-sm"
          >
            {initial}
          </span>
          <span className="hidden max-w-32 truncate text-xs tracking-wide uppercase sm:inline">
            {account.displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {/* The trigger truncates and hides the name below `sm`; this is where it is
            always readable in full. */}
        <DropdownMenuLabel>{account.displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/history">Call history</Link>
        </DropdownMenuItem>

        {/* A form, because /auth/signout is POST-only — a GET signout is reachable
            by link prefetch and by any third-party image tag. */}
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
