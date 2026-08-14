/**
 * What a user-facing message may never contain.
 *
 * `code-standards.md` → Error Handling: "User-facing messages are plain,
 * actionable, and never contain an error code, stack trace, database message, or
 * provider name." That was a rule enforced by review until F24, which is to say
 * enforced until someone edited copy without re-reading it — and copy is exactly
 * what gets edited later.
 *
 * Shared by the unit tests over the pure copy modules and the e2e over what the
 * API routes actually return, so the two halves cannot drift into disagreeing
 * about what a leak is. Lives under `tests/support/` rather than `tests/e2e/
 * support/` because both suites import it.
 */

export interface ForbiddenPattern {
  /** Named so a failure says which rule broke, not just that one did. */
  label: string;
  pattern: RegExp;
}

export const FORBIDDEN_IN_USER_COPY: readonly ForbiddenPattern[] = [
  {
    label: 'a service or vendor name',
    // The infrastructure is ours to know about and nobody else's. "Supabase" in
    // a message tells a person nothing they can act on and tells everyone else
    // what to probe.
    pattern: /\b(livekit|supabase|postgres|google|render|webrtc|sfu|oauth|jwt)\b/i,
  },
  {
    label: 'a protocol or transport detail',
    pattern: /\b(websocket|rtc|ice|turn|stun|sctp|http|tcp|udp)\b/i,
  },
  {
    label: 'an error code or enum member',
    // SCREAMING_SNAKE is how every enum member in this stack is spelled.
    pattern: /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/,
  },
  {
    label: 'a bare status code',
    // 400/404/410/500 and friends. Deliberately not any three-digit number in
    // prose — see `isForbidden`, which strips digits that are plainly not codes.
    pattern: /\b[45]\d{2}\b/,
  },
  {
    label: 'a stack frame or source path',
    pattern: /\bat \w+ \(|\.tsx?:\d+|node_modules|\/src\//,
  },
  {
    label: 'a raw exception name',
    pattern: /\b\w*(Error|Exception)\b(?!\s)/,
  },
];

/**
 * The first rule a message breaks, or null.
 *
 * Returns the label rather than a boolean so a failing test names the problem
 * instead of printing "expected true to be false" against a paragraph of prose.
 */
export function forbiddenCopyReason(message: string): string | null {
  for (const { label, pattern } of FORBIDDEN_IN_USER_COPY) {
    if (pattern.test(message)) return label;
  }

  return null;
}
