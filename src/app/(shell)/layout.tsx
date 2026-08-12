import { AuthMenu } from '@/components/shell/auth-menu';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { createClient } from '@/lib/supabase/server';

/**
 * Chrome for Home and Call History.
 *
 * `/room/[code]` deliberately sits OUTSIDE this group: the call is a full-bleed
 * `dvh` surface with fixed top status and bottom controls, and a footer would
 * both break that layout and steal vertical space on the phones where it is
 * tightest. Keeping the exclusion structural means a new page cannot inherit a
 * footer into the call by forgetting to opt out.
 *
 * Auth is resolved here, server-side, so the header renders in its correct state
 * on first paint rather than flickering from signed-out to signed-in. Reading the
 * session cookie makes these routes dynamic, which they already were in practice.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // getUser(), never getSession(): getUser revalidates against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The display name comes from `profiles`, never `user_metadata` — one derivation
  // of a name (the auth.users trigger's coalesce chain) means the header cannot
  // disagree with what call history shows. `user_metadata` is also user-editable,
  // so it must never be treated as trustworthy.
  let displayName: string | null = null;

  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id) // Explicit scope. RLS enforces the same rule independently.
      .maybeSingle();

    if (error) {
      console.error('[shell] profile lookup failed', error);
    }

    // A signed-in user with no profile row is still signed in — the menu has to
    // render, so fall back to a neutral label rather than dropping them to guest.
    displayName = data?.display_name ?? 'Account';
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader actions={<AuthMenu account={displayName ? { displayName } : null} />} />
      {/* flex-col so a page can `flex-1` to fill the region — `min-h-full` on the
          child does not resolve against a flex item with an auto basis. */}
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
