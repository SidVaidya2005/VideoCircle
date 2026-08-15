import { createHash, randomUUID } from 'node:crypto';

import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

import type { Database } from '@/types/database';

/**
 * Signing and posting LiveKit webhooks the way LiveKit itself does.
 *
 * LiveKit Cloud cannot reach `localhost`, so the suite plays the sender. This is
 * not a mock of our handler: the payload is real protobuf-JSON, the signature is a
 * real HS256 JWT over a real digest of the body, and `WebhookReceiver` verifies it
 * with no test-only path through the route. The only thing not exercised is
 * LiveKit's decision to send — which is what feature 25 confirms.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required by the webhook suite. It is read from .env.local by playwright.config.ts.`,
    );
  }
  return value;
}

/**
 * The `Authorization` header LiveKit sends: a JWT whose `sha256` claim is the
 * base64 digest of the exact body bytes.
 *
 * `AccessToken` is used rather than hand-rolled JWT signing so the suite and the
 * production receiver agree by construction — this is the same class `token.ts`
 * uses, with the same claim `WebhookReceiver.receive()` compares against.
 */
export async function signWebhookBody(body: string): Promise<string> {
  const token = new AccessToken(requiredEnv('LIVEKIT_API_KEY'), requiredEnv('LIVEKIT_API_SECRET'), {
    ttl: '5m',
  });

  token.sha256 = createHash('sha256').update(body).digest('base64');
  return token.toJwt();
}

export interface WebhookPayload {
  event: string;
  id: string;
  createdAt: string;
  room: { name: string };
  participant?: { identity: string; name: string; joinedAt: string };
}

/** Protobuf JSON encodes 64-bit integers as strings, which is what LiveKit sends. */
function toProtoSeconds(at: Date): string {
  return String(Math.floor(at.getTime() / 1000));
}

export function participantJoinedPayload(params: {
  roomCode: string;
  identity: string;
  displayName: string;
  at: Date;
}): WebhookPayload {
  return {
    event: 'participant_joined',
    id: randomUUID(),
    createdAt: toProtoSeconds(params.at),
    room: { name: params.roomCode },
    participant: {
      identity: params.identity,
      name: params.displayName,
      joinedAt: toProtoSeconds(params.at),
    },
  };
}

export function participantLeftPayload(params: {
  roomCode: string;
  identity: string;
  displayName: string;
  at: Date;
}): WebhookPayload {
  return {
    event: 'participant_left',
    id: randomUUID(),
    createdAt: toProtoSeconds(params.at),
    room: { name: params.roomCode },
    participant: {
      identity: params.identity,
      name: params.displayName,
      // Present on the real event too; the handler reads the event's own
      // createdAt for the leave time, never this.
      joinedAt: toProtoSeconds(params.at),
    },
  };
}

export function roomFinishedPayload(params: { roomCode: string; at: Date }): WebhookPayload {
  return {
    event: 'room_finished',
    id: randomUUID(),
    createdAt: toProtoSeconds(params.at),
    room: { name: params.roomCode },
  };
}

/**
 * Posts a signed webhook.
 *
 * The body is serialised once and both signed and sent as that exact string —
 * re-serialising between the two is precisely the mistake the signature exists to
 * catch, and it would make every test fail confusingly.
 */
export async function postWebhook(
  request: APIRequestContext,
  payload: WebhookPayload,
): Promise<APIResponse> {
  const body = JSON.stringify(payload);

  return request.post('/api/livekit/webhook', {
    headers: {
      Authorization: await signWebhookBody(body),
      'Content-Type': 'application/webhook+json',
    },
    data: body,
  });
}

/**
 * Posts a body that no longer matches the signature covering it.
 *
 * The altered field is `id`, replaced with a fresh uuid. It has to be one whose
 * value is guaranteed to change: an earlier version of this helper overwrote
 * `room.name` with a constant that some callers were already using, so the
 * "tampered" body was byte-identical, the signature verified, and the test passed
 * while proving nothing.
 */
export async function postTamperedWebhook(
  request: APIRequestContext,
  payload: WebhookPayload,
): Promise<APIResponse> {
  const authorization = await signWebhookBody(JSON.stringify(payload));
  const tampered = JSON.stringify({ ...payload, id: randomUUID() });

  return request.post('/api/livekit/webhook', {
    headers: { Authorization: authorization, 'Content-Type': 'application/webhook+json' },
    data: tampered,
  });
}

/**
 * The service-role client, for reading back what the handler wrote.
 *
 * Assertions go against the database rather than an endpoint because there is no
 * endpoint to read participation until feature 21 — and asserting on the rows is
 * what the feature is actually about.
 */
/**
 * Retries once, and only on a *thrown* transport error.
 *
 * Three webhook specs failed a full-suite run with `TypeError: fetch failed`
 * caused by `read ECONNRESET`, then all nine passed in isolation immediately
 * after — the free Supabase project resetting connections when the whole suite
 * queries it at once. That is the connection, not the query.
 *
 * The retry deliberately covers nothing else: a response that arrives is
 * returned as-is however bad its status, so a genuine 4xx or 5xx from PostgREST
 * stays exactly as loud as it was. Same rule as `createMeeting` in `media.ts`.
 */
async function retryOnTransportError(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    return await fetch(input, init);
  }
}

export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      // Every read in the webhook and history specs goes through this client, so
      // the retry belongs here rather than at each call site.
      global: { fetch: retryOnTransportError },
    },
  );
}

export async function meetingIdForCode(
  db: SupabaseClient<Database>,
  code: string,
): Promise<string> {
  const { data, error } = await db.from('meetings').select('id').eq('code', code).single();
  if (error) throw error;
  return data.id;
}

/**
 * Ages a freshly created meeting so webhook events can sit realistically inside it.
 *
 * A meeting created by `/api/meetings` has `created_at = now()`, but these tests
 * need event timestamps in the *past* to prove the handler reads LiveKit's clock
 * rather than its own — and `meetings_ended_after_creation` rejects an `ended_at`
 * older than `created_at`. Backdating the meeting is the honest fix: a call being
 * recorded is one that started a while ago. Setting the times forward instead would
 * have meant asserting on future-dated rows to dodge a constraint.
 */
export async function backdateMeeting(
  db: SupabaseClient<Database>,
  meetingId: string,
  createdAt: Date,
): Promise<void> {
  const { error } = await db
    .from('meetings')
    .update({ created_at: createdAt.toISOString() })
    .eq('id', meetingId);

  if (error) throw error;
}

export type ParticipationRow = Database['public']['Tables']['meeting_participants']['Row'];

export async function participationRows(
  db: SupabaseClient<Database>,
  meetingId: string,
): Promise<ParticipationRow[]> {
  const { data, error } = await db
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * A real auth user, so the `user:` identity path can be exercised against the
 * actual foreign key to `profiles` rather than only in a unit test. The profile row
 * arrives via the `on_auth_user_created` trigger, which is part of what this proves.
 */
export async function createTestUser(db: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: `webhook-spec-${randomUUID()}@videocircle.test`,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user.id;
}

/** Cascades to `profiles`, and from there to any participation row of theirs. */
export async function deleteTestUser(db: SupabaseClient<Database>, userId: string): Promise<void> {
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
}

/** Cascades to the participation rows, so one delete cleans a whole test up. */
export async function deleteMeeting(
  db: SupabaseClient<Database>,
  meetingId: string,
): Promise<void> {
  const { error } = await db.from('meetings').delete().eq('id', meetingId);
  if (error) throw error;
}
