/**
 * The link you hand to someone so they can join.
 *
 * Built from the configured site URL rather than `window.location.origin`, so a
 * link given to another person names the canonical host even if this person
 * reached the app on a preview deployment, an IP address, or localhost.
 *
 * The fragment is passed in rather than read here, which keeps `window` in the
 * event handler that calls this and leaves the function testable. It is carried
 * **verbatim**: no parsing, no trimming, and above all no case-normalisation —
 * the chat key is base64url and case-sensitive, so lowercasing a link would
 * produce one that still joins the call and silently cannot read chat.
 */
export function buildInviteLink(siteUrl: string, code: string, hash: string): string {
  // A trailing slash on the configured origin would otherwise produce `//room/`.
  return `${siteUrl.replace(/\/+$/, '')}/room/${code}${hash}`;
}
