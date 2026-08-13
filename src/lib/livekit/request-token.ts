import { z } from 'zod';

export interface TokenGrant {
  serverUrl: string;
  token: string;
  identity: string;
}

export type TokenRequest =
  { ok: true; grant: TokenGrant } | { ok: false; code: string; message: string };

// A response is a boundary like any other, so it is parsed rather than trusted.
// A 200 carrying the wrong shape is a failure, not a grant: handing an undefined
// token to LiveKit fails later, at connect time, with an opaque error.
const GrantSchema = z.object({
  serverUrl: z.string().min(1),
  token: z.string().min(1),
  identity: z.string().min(1),
});

const ErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const UNREACHABLE = {
  ok: false as const,
  code: 'network',
  message: 'Could not reach the server. Check your connection and try again.',
};

/**
 * Asks the server for a token to join one meeting.
 *
 * Failure carries the server's own `code` and `message`: the code decides what the
 * lobby offers next — a retry for something transient, a way to start a new
 * meeting for something final — and the message is written once, in the route, so
 * the two cannot drift into saying different things about the same failure.
 */
export async function requestToken(code: string, displayName: string): Promise<TokenRequest> {
  let response: Response;

  try {
    response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, displayName }),
    });
  } catch {
    // fetch rejects only on a transport failure; an HTTP error status resolves.
    return UNREACHABLE;
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body);
    return parsed.success
      ? { ok: false, code: parsed.data.error.code, message: parsed.data.error.message }
      : UNREACHABLE;
  }

  const parsed = GrantSchema.safeParse(body);
  return parsed.success ? { ok: true, grant: parsed.data } : UNREACHABLE;
}
