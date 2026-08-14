import { randomUUID } from 'node:crypto';

import type { BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import { serviceClient } from './webhook';

/**
 * Signing a Playwright context in as a real Supabase user.
 *
 * **Why this exists.** Google OAuth is the only sign-in method in the product, and
 * Playwright cannot drive Google's consent screen. The obvious workaround — enabling
 * the email/password provider — would open a live account-creation surface that an
 * open follow-up says to close. So the session is minted through the admin API
 * instead: `generateLink` produces a one-time token without sending mail, `verifyOtp`
 * exchanges it for a genuine session, and that session is written into the browser
 * in the exact cookie shape `@supabase/ssr` reads.
 *
 * **Nothing here is faked.** The access token is signed by Supabase, `getUser()`
 * revalidates it against the auth server on every request, and RLS sees the real
 * `auth.uid()`. The only thing skipped is the identity provider handshake, which is
 * Google's code, not ours.
 */

/** Mirrors `MAX_CHUNK_SIZE` in `@supabase/ssr`'s chunker. */
const MAX_CHUNK_SIZE = 3_180;
const BASE64_PREFIX = 'base64-';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required by the session helper.`);
  return value;
}

/** `sb-<project-ref>-auth-token`, the storage key `@supabase/ssr` derives from the URL. */
function storageKey(): string {
  const host = new URL(requiredEnv('NEXT_PUBLIC_SUPABASE_URL')).hostname;
  const ref = host.split('.')[0];
  if (!ref) throw new Error('could not read the project ref out of NEXT_PUBLIC_SUPABASE_URL');

  return `sb-${ref}-auth-token`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Splits a value the way `@supabase/ssr` does, so a large session round-trips.
 *
 * A session carrying a long JWT can exceed one cookie, and the reader looks for
 * `<key>.0`, `<key>.1`, … in that case. Writing one oversized cookie instead would
 * be silently dropped by the browser and present as "not signed in".
 */
function toCookieChunks(key: string, value: string): { name: string; value: string }[] {
  if (encodeURIComponent(value).length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  const chunks: { name: string; value: string }[] = [];
  let rest = value;
  let index = 0;

  while (rest.length > 0) {
    // Conservative slice: encodeURIComponent can expand a character to several,
    // so cutting on the raw string under the encoded budget is always safe.
    const size = Math.max(1, Math.floor(MAX_CHUNK_SIZE / 3));
    chunks.push({ name: `${key}.${index}`, value: rest.slice(0, size) });
    rest = rest.slice(size);
    index += 1;
  }

  return chunks;
}

export interface TestAccount {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Creates an auth user and returns it. The `profiles` row arrives via the
 * `on_auth_user_created` trigger, which derives the display name from the email's
 * local part when there is no OAuth metadata.
 */
export async function createAccount(): Promise<TestAccount> {
  const db = serviceClient();
  const local = `history-${randomUUID().slice(0, 8)}`;
  const email = `${local}@videocircle.test`;

  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;

  return { userId: data.user.id, email, displayName: local };
}

export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await serviceClient().auth.admin.deleteUser(userId);
  if (error) throw error;
}

/** Puts a genuine session for `email` into the browser context. */
export async function signIn(context: BrowserContext, email: string, baseUrl: string) {
  const { data: link, error: linkError } = await serviceClient().auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) throw linkError;

  const tokenHash = link.properties?.hashed_token;
  if (!tokenHash) throw new Error('generateLink returned no hashed_token');

  // The anon client, exactly as the browser would use it — this is a real exchange.
  const anon = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (error) throw error;
  if (!data.session) throw new Error('verifyOtp returned no session');

  const encoded = BASE64_PREFIX + toBase64Url(JSON.stringify(data.session));

  // `domain` + `path`, never alongside `url` — Playwright rejects both together.
  await context.addCookies(
    toCookieChunks(storageKey(), encoded).map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain: new URL(baseUrl).hostname,
      path: '/',
      sameSite: 'Lax' as const,
    })),
  );
}
