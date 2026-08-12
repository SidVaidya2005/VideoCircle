/**
 * Resolves the OAuth callback's `next` parameter to a path we are willing to
 * redirect to, falling back to Home.
 *
 * `next` is attacker-influenced: it arrives as a query parameter on a URL anyone
 * can construct and hand to a victim. A prefix check is NOT a same-origin check —
 * `//evil.com` and `/\evil.com` both start with `/`, and WHATWG URL treats `\` as
 * `/` in special schemes, so both resolve to a different origin entirely. The only
 * reliable test is to resolve against our own origin and compare the result.
 *
 * The fragment is dropped deliberately. `next` never legitimately carries one, and
 * the chat key crosses the OAuth round trip in `sessionStorage` precisely so that
 * it never appears in a URL that reaches a server — see `@/lib/auth/sign-in`.
 *
 * Lives in its own module rather than inside the route handler so Vitest can cover
 * it: the unit config is `environment: 'node'` over `tests/unit/**`, which reaches
 * pure functions only.
 */
export function safeNext(next: string, origin: string): string {
  try {
    const url = new URL(next, origin);
    return url.origin === new URL(origin).origin ? url.pathname + url.search : '/';
  } catch {
    // An unparseable `next` is indistinguishable from an absent one, and Home is
    // the right answer to both.
    return '/';
  }
}
