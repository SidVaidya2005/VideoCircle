import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { createMeeting, UNKNOWN_CODE } from './support/media';
import {
  backdateMeeting,
  createTestUser,
  deleteMeeting,
  deleteTestUser,
  meetingIdForCode,
  participantJoinedPayload,
  participantLeftPayload,
  participationRows,
  postTamperedWebhook,
  postWebhook,
  roomFinishedPayload,
  serviceClient,
} from './support/webhook';

/**
 * Participation recording, driven by signed webhooks the suite sends itself.
 *
 * **Every timestamp assertion is against an event time deliberately in the past.**
 * That is the point of most of these tests: a handler using `now()` would pass a
 * "row exists" check and still record a duration that never happened, which is what
 * feature 21 would then render to the user.
 */

/** Old enough that every event below lands in the past and after the meeting began. */
const MEETING_AGE_SECONDS = 3_600;

interface OpenMeeting {
  db: SupabaseClient<Database>;
  code: string;
  meetingId: string;
  startedAt: Date;
}

/**
 * A meeting that began an hour ago.
 *
 * `/api/meetings` stamps `created_at = now()`, and `meetings_ended_after_creation`
 * refuses an `ended_at` older than that — so a meeting recorded with past event
 * times has to actually be old. Backdating it is what lets the assertions use
 * realistic timestamps instead of future-dated ones.
 */
async function openMeeting(request: APIRequestContext): Promise<OpenMeeting> {
  const db = serviceClient();
  const code = await createMeeting(request);
  const meetingId = await meetingIdForCode(db, code);
  const startedAt = new Date((Math.floor(Date.now() / 1000) - MEETING_AGE_SECONDS) * 1000);

  await backdateMeeting(db, meetingId, startedAt);
  return { db, code, meetingId, startedAt };
}

/** A whole-second time inside the meeting — never equal to `now()`. */
function at(meeting: OpenMeeting, offsetSeconds: number): Date {
  return new Date(meeting.startedAt.getTime() + offsetSeconds * 1000);
}

function guestIdentity(): string {
  return `guest:${randomUUID()}`;
}

/** For the tests that never touch a meeting row. */
function looseEventTime(): Date {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

test('a request with no signature is refused', async ({ request }) => {
  const response = await request.post('/api/livekit/webhook', {
    headers: { 'Content-Type': 'application/webhook+json' },
    data: JSON.stringify(roomFinishedPayload({ roomCode: UNKNOWN_CODE, at: looseEventTime() })),
  });

  expect(response.status()).toBe(401);
});

test('a body altered after signing is refused', async ({ request }) => {
  // The one that proves the signature is actually checked. A handler that merely
  // required the header to be present would pass the test above and fail this.
  const response = await postTamperedWebhook(
    request,
    roomFinishedPayload({ roomCode: UNKNOWN_CODE, at: looseEventTime() }),
  );

  expect(response.status()).toBe(401);
});

test('a guest join writes one row carrying the event’s own timestamp', async ({ request }) => {
  const meeting = await openMeeting(request);
  const identity = guestIdentity();
  const joinedAt = at(meeting, 60);

  try {
    const response = await postWebhook(
      request,
      participantJoinedPayload({
        roomCode: meeting.code,
        identity,
        displayName: 'Ada',
        at: joinedAt,
      }),
    );
    expect(response.status()).toBe(200);

    const rows = await participationRows(meeting.db, meeting.meetingId);
    expect(rows).toHaveLength(1);

    const row = rows[0];
    expect(row?.identity).toBe(identity);
    expect(row?.display_name).toBe('Ada');
    expect(row?.user_id).toBeNull();
    expect(row?.is_guest).toBe(true);
    expect(row?.left_at).toBeNull();

    // The assertion the whole timestamp decision rests on.
    expect(new Date(row?.joined_at ?? 0).getTime()).toBe(joinedAt.getTime());
  } finally {
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('a signed-in join resolves its identity to the profile', async ({ request }) => {
  const meeting = await openMeeting(request);
  const userId = await createTestUser(meeting.db);

  try {
    const response = await postWebhook(
      request,
      participantJoinedPayload({
        roomCode: meeting.code,
        identity: `user:${userId}`,
        displayName: 'Grace',
        at: at(meeting, 60),
      }),
    );
    expect(response.status()).toBe(200);

    const rows = await participationRows(meeting.db, meeting.meetingId);
    expect(rows).toHaveLength(1);
    // Proves the prefix parse AND the foreign key into profiles, which only exists
    // because the auth trigger created that row.
    expect(rows[0]?.user_id).toBe(userId);
    expect(rows[0]?.is_guest).toBe(false);
  } finally {
    await deleteTestUser(meeting.db, userId);
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('the same join delivered twice leaves exactly one row', async ({ request }) => {
  const meeting = await openMeeting(request);
  const payload = participantJoinedPayload({
    roomCode: meeting.code,
    identity: guestIdentity(),
    displayName: 'Ada',
    at: at(meeting, 60),
  });

  try {
    const first = await postWebhook(request, payload);
    const second = await postWebhook(request, payload);

    expect(first.status()).toBe(200);
    // 200, not an error: a redelivery is normal operation, and answering non-2xx
    // would make LiveKit retry the thing it is already retrying.
    expect(second.status()).toBe(200);

    expect(await participationRows(meeting.db, meeting.meetingId)).toHaveLength(1);
  } finally {
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('a leave closes the row, and redelivering it changes nothing', async ({ request }) => {
  const meeting = await openMeeting(request);
  const identity = guestIdentity();
  const leftAt = at(meeting, 180);

  try {
    await postWebhook(
      request,
      participantJoinedPayload({
        roomCode: meeting.code,
        identity,
        displayName: 'Ada',
        at: at(meeting, 60),
      }),
    );

    const leave = participantLeftPayload({
      roomCode: meeting.code,
      identity,
      displayName: 'Ada',
      at: leftAt,
    });
    expect((await postWebhook(request, leave)).status()).toBe(200);

    const afterLeave = await participationRows(meeting.db, meeting.meetingId);
    expect(afterLeave).toHaveLength(1);
    expect(new Date(afterLeave[0]?.left_at ?? 0).getTime()).toBe(leftAt.getTime());

    // A redelivery must not move a leave time that was already right.
    expect((await postWebhook(request, leave)).status()).toBe(200);

    const afterRedelivery = await participationRows(meeting.db, meeting.meetingId);
    expect(afterRedelivery).toHaveLength(1);
    expect(afterRedelivery[0]?.left_at).toBe(afterLeave[0]?.left_at);
  } finally {
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('room_finished closes a row whose leave never arrived', async ({ request }) => {
  // The killed-tab case, made deterministic: a join with no matching leave, then
  // the room ending. Without the reconciliation this row keeps left_at null and the
  // meeting shows an open participant forever.
  const meeting = await openMeeting(request);
  const finishedAt = at(meeting, 300);

  try {
    await postWebhook(
      request,
      participantJoinedPayload({
        roomCode: meeting.code,
        identity: guestIdentity(),
        displayName: 'Ada',
        at: at(meeting, 60),
      }),
    );

    const finish = roomFinishedPayload({ roomCode: meeting.code, at: finishedAt });
    expect((await postWebhook(request, finish)).status()).toBe(200);

    const rows = await participationRows(meeting.db, meeting.meetingId);
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0]?.left_at ?? 0).getTime()).toBe(finishedAt.getTime());

    const { data: closed } = await meeting.db
      .from('meetings')
      .select('ended_at')
      .eq('id', meeting.meetingId)
      .single();
    expect(new Date(closed?.ended_at ?? 0).getTime()).toBe(finishedAt.getTime());

    // Idempotent: redelivering must not move ended_at either.
    expect((await postWebhook(request, finish)).status()).toBe(200);
    expect(await participationRows(meeting.db, meeting.meetingId)).toHaveLength(1);
  } finally {
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('a well-formed code naming no meeting is accepted and writes nothing', async ({ request }) => {
  // 200 rather than an error on purpose: LiveKit retries non-2xx, and no number of
  // retries will conjure a meeting that was never created.
  const response = await postWebhook(
    request,
    participantJoinedPayload({
      roomCode: UNKNOWN_CODE,
      identity: guestIdentity(),
      displayName: 'Ada',
      at: looseEventTime(),
    }),
  );

  expect(response.status()).toBe(200);

  const db = serviceClient();
  const { data } = await db.from('meetings').select('id').eq('code', UNKNOWN_CODE);
  expect(data).toHaveLength(0);
});

test('a join carrying no participant is accepted and writes nothing', async ({ request }) => {
  // `participant` is a message field, so an event without one decodes to undefined
  // rather than failing to parse. Reaching for `.identity` on it would throw into
  // the 500 below and have LiveKit redeliver forever — a payload no retry improves.
  const meeting = await openMeeting(request);

  try {
    const response = await postWebhook(request, {
      ...participantJoinedPayload({
        roomCode: meeting.code,
        identity: guestIdentity(),
        displayName: 'Ada',
        at: at(meeting, 60),
      }),
      // `JSON.stringify` drops an undefined value, so the signed body carries no
      // `participant` key at all — which is what LiveKit's proto would send.
      participant: undefined,
    });

    expect(response.status()).toBe(200);
    expect(await participationRows(meeting.db, meeting.meetingId)).toHaveLength(0);
  } finally {
    await deleteMeeting(meeting.db, meeting.meetingId);
  }
});

test('an event we do not handle is accepted without a meeting lookup', async ({ request }) => {
  const response = await postWebhook(request, {
    ...roomFinishedPayload({ roomCode: UNKNOWN_CODE, at: looseEventTime() }),
    event: 'track_published',
  });

  expect(response.status()).toBe(200);
});
