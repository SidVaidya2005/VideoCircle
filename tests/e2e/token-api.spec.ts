import { expect, test } from '@playwright/test';

import { createMeeting, MALFORMED_CODE, UNKNOWN_CODE } from './support/media';

interface VideoGrant {
  room?: string;
  roomJoin?: boolean;
  roomAdmin?: boolean;
  roomCreate?: boolean;
  roomList?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  canUpdateOwnMetadata?: boolean;
}

/** Reads a JWT's claims without verifying it — enough to inspect what we granted. */
function decodeClaims(token: string): { video?: VideoGrant; sub?: string; exp?: number } {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('token has no payload segment');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

test('a well-formed code that names no meeting gets no token', async ({ request }) => {
  const response = await request.post('/api/token', {
    data: { code: UNKNOWN_CODE, displayName: 'Someone' },
  });

  expect(response.status()).toBe(404);

  // The stated criterion is not merely a 404 — it is that nothing token-shaped
  // comes back. A valid-looking code must never be enough to get into a room.
  const body = await response.text();
  expect(body).not.toContain('token');
  expect(body).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
});

test('the grant names exactly one room and carries no admin claims', async ({ request }) => {
  const code = await createMeeting(request);

  const response = await request.post('/api/token', {
    data: { code, displayName: 'Grant Inspector' },
  });
  expect(response.status()).toBe(200);

  const { token, serverUrl, identity } = (await response.json()) as {
    token: string;
    serverUrl: string;
    identity: string;
  };

  expect(serverUrl).toMatch(/^wss:\/\//);
  // A guest, since this request carries no session cookie.
  expect(identity).toMatch(/^guest:/);

  const claims = decodeClaims(token);
  expect(claims.video?.room).toBe(code);
  expect(claims.video?.roomJoin).toBe(true);
  expect(claims.video?.canPublishData).toBe(true);

  // Raise-hand is a participant attribute, which needs this claim. It lets a
  // client describe *itself* and grants no authority over the room or over
  // anyone else in it — pinned here so the widening stays deliberate.
  expect(claims.video?.canUpdateOwnMetadata).toBe(true);

  // The three that would turn a join token into a skeleton key.
  expect(claims.video?.roomAdmin).toBeFalsy();
  expect(claims.video?.roomCreate).toBeFalsy();
  expect(claims.video?.roomList).toBeFalsy();
});

test('the token cannot outlive its meeting', async ({ request }) => {
  const code = await createMeeting(request);

  const response = await request.post('/api/token', {
    data: { code, displayName: 'Clock Watcher' },
  });
  const { token } = (await response.json()) as { token: string };

  const claims = decodeClaims(token);
  const secondsFromNow = (claims.exp ?? 0) - Math.floor(Date.now() / 1000);

  // A fresh meeting has 24 hours left, so this must be the one-hour cap and not
  // the meeting's own lifetime.
  expect(secondsFromNow).toBeGreaterThan(0);
  expect(secondsFromNow).toBeLessThanOrEqual(3600 + 60);
});

test('malformed input is refused before any work happens', async ({ request }) => {
  const cases = [
    { label: 'malformed code', data: { code: MALFORMED_CODE, displayName: 'Someone' } },
    { label: 'empty name', data: { code: UNKNOWN_CODE, displayName: '   ' } },
    { label: 'over-long name', data: { code: UNKNOWN_CODE, displayName: 'x'.repeat(49) } },
    { label: 'no body at all', data: {} },
  ];

  for (const { label, data } of cases) {
    const response = await request.post('/api/token', { data });
    expect(response.status(), label).toBe(400);

    // Never echo the schema back to the caller.
    const body = await response.text();
    expect(body, label).not.toContain('displayName');
  }
});
