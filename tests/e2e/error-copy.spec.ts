import { expect, test, type APIResponse } from '@playwright/test';

import { forbiddenCopyReason } from '../support/forbidden-copy';
import { MALFORMED_CODE, UNKNOWN_CODE } from './support/media';

/**
 * What the server actually says when it refuses.
 *
 * The route handlers write their own user-facing `message` and `request-token.ts`
 * hands it to the UI verbatim — so these strings are user-facing copy that lives
 * in server files, unreachable by the unit tests that cover the pure copy
 * modules. `code-standards.md` forbids a code, a stack, or a provider name in any
 * of them; until F24 that was enforced by review.
 *
 * Asserted against the shared pattern set, so this and the unit tests cannot
 * drift into disagreeing about what a leak is.
 */

async function expectCleanError(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);

  const body = (await response.json()) as { error?: { code?: string; message?: string } };

  // The shape itself is the contract: `apiError(code, message, status)`. A bare
  // Response or an unshaped object would mean the UI has nothing to render.
  expect(body.error?.code, 'no error.code in the body').toBeTruthy();
  const message = body.error?.message ?? '';
  expect(message.length, 'no error.message in the body').toBeGreaterThan(0);

  const leak = forbiddenCopyReason(message);
  expect(leak, `message contains ${leak}: ${message}`).toBeNull();

  // The machine-readable half may be a code — that is what it is for, and the UI
  // switches on it. It must simply never be the half that gets rendered, which is
  // why `code` is excluded from the copy check and `message` is not.
  expect(message).not.toBe(body.error?.code);
}

test('a malformed room code is refused without leaking anything', async ({ request }) => {
  await expectCleanError(
    await request.post('/api/token', { data: { code: MALFORMED_CODE, displayName: 'Someone' } }),
    400,
  );
});

test('an empty token request is refused without leaking anything', async ({ request }) => {
  // No body at all: the handler parses with Zod first and must not echo the
  // validation error object, which would carry field paths and expected types.
  await expectCleanError(await request.post('/api/token', { data: {} }), 400);
});

test('an over-long display name is refused without leaking the limit as a code', async ({
  request,
}) => {
  await expectCleanError(
    await request.post('/api/token', {
      data: { code: UNKNOWN_CODE, displayName: 'x'.repeat(500) },
    }),
    400,
  );
});

test('an unknown meeting is refused without leaking anything', async ({ request }) => {
  await expectCleanError(
    await request.post('/api/token', { data: { code: UNKNOWN_CODE, displayName: 'Someone' } }),
    404,
  );
});

test('an unsigned webhook is refused without leaking anything', async ({ request }) => {
  // The sender is authenticated by signature, so this is the one route whose
  // errors a stranger can reach at will — and therefore the one whose copy most
  // needs to say nothing about how the check works.
  await expectCleanError(await request.post('/api/livekit/webhook', { data: {} }), 401);
});

test('a badly signed webhook is refused without leaking anything', async ({ request }) => {
  await expectCleanError(
    await request.post('/api/livekit/webhook', {
      headers: { Authorization: 'not-a-real-signature' },
      data: {},
    }),
    401,
  );
});

// Guards the guard. Every assertion above passes if `forbiddenCopyReason` has
// quietly stopped matching anything — a leak check that cannot fail is the most
// dangerous green in the suite, which is the same reason `chat.spec.ts` asserts
// its recording is non-empty.
test('the leak check itself still catches a leak', () => {
  expect(forbiddenCopyReason('Could not reach the server.')).toBeNull();

  expect(forbiddenCopyReason('LiveKit returned 500')).not.toBeNull();
  expect(forbiddenCopyReason('MEETING_EXPIRED')).not.toBeNull();
  expect(forbiddenCopyReason('TypeError: undefined is not a function')).not.toBeNull();
  expect(forbiddenCopyReason('at handler (/src/app/api/token/route.ts:12)')).not.toBeNull();
});
