import type { WebhookEvent } from 'livekit-server-sdk';
import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/api';
import { eventTimestampIso } from '@/lib/livekit/participation-event';
import { webhookReceiver } from '@/lib/livekit/webhook';
import { findMeetingByCode } from '@/lib/meetings';
import { closeMeeting, recordParticipantJoined, recordParticipantLeft } from '@/lib/participation';
import { isValidRoomCode } from '@/lib/room-code';

/**
 * The three events call history is built from. Everything else LiveKit sends —
 * `room_started`, the track and egress events, and `participant_connection_aborted`
 * — is understood and deliberately ignored. The aborted one is worth naming: a
 * connection that never reached `active` fired no `participant_joined`, so there is
 * no row for it to close.
 */
const HANDLED_EVENTS = ['participant_joined', 'participant_left', 'room_finished'] as const;

type HandledEvent = (typeof HANDLED_EVENTS)[number];

function isHandledEvent(event: string): event is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(event);
}

/** Named off the event rather than `@livekit/protocol`, which is a transitive
 *  dependency and not one this project declares. */
type WebhookParticipant = NonNullable<WebhookEvent['participant']>;

/**
 * The participant both join and leave match a row by.
 *
 * `identity` is the join↔leave correlation key, and it can go missing two ways:
 * `participant` is a message field, so an absent one decodes to `undefined`,
 * while `identity` is a scalar, so an absent one decodes to the empty string.
 * One check covers both, and neither can be matched to a row. No redelivery
 * supplies what the first delivery lacked, so this warns and drops rather than
 * throwing through to the 500 that would have LiveKit retry it forever.
 */
function identifiedParticipant(
  event: WebhookEvent,
  eventName: HandledEvent,
): WebhookParticipant | null {
  const participant = event.participant;
  if (!participant?.identity) {
    console.warn('[api/livekit/webhook] event carried no identity', eventName);
    return null;
  }

  return participant;
}

async function handleParticipantJoined(
  event: WebhookEvent,
  meetingId: string,
  now: Date,
): Promise<void> {
  const participant = identifiedParticipant(event, 'participant_joined');
  if (!participant) return;

  const outcome = await recordParticipantJoined({
    meetingId,
    identity: participant.identity,
    displayName: participant.name,
    joinedAt: eventTimestampIso(participant.joinedAt, now),
  });

  if (outcome === 'duplicate') {
    console.warn('[api/livekit/webhook] join already recorded', participant.identity);
  }
}

async function handleParticipantLeft(
  event: WebhookEvent,
  meetingId: string,
  now: Date,
): Promise<void> {
  const participant = identifiedParticipant(event, 'participant_left');
  if (!participant) return;

  // The leave time is the event's own `createdAt`, never the participant's
  // `joinedAt`, which the payload also carries.
  const outcome = await recordParticipantLeft({
    meetingId,
    identity: participant.identity,
    leftAt: eventTimestampIso(event.createdAt, now),
  });

  if (outcome === 'no_open_row') {
    console.warn('[api/livekit/webhook] no open row to close', participant.identity);
  }
}

/**
 * Records who joined a meeting, who left, and when it ended.
 *
 * This route is not user-authenticated. It authenticates the *sender* instead, by
 * verifying LiveKit's signature over the raw request body — which is why the body is
 * read with `text()` and never `json()`: the signature covers those exact bytes.
 *
 * **Status codes carry meaning to LiveKit, which retries anything non-2xx.** A
 * transient failure answers `500` so the event comes back; anything that could never
 * succeed on a retry — an unrecognised event, a room code naming no meeting, a
 * malformed payload — answers `200`, because redelivering it forever accomplishes
 * nothing. That trade is only safe because every write behind here is idempotent.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    return apiError('unauthorized', 'Missing signature.', 401);
  }

  let event: WebhookEvent;
  try {
    event = await webhookReceiver.receive(rawBody, authorization);
  } catch (error) {
    console.error('[api/livekit/webhook] signature verification failed', error);
    return apiError('unauthorized', 'Invalid signature.', 401);
  }

  const eventName = event.event;
  if (!isHandledEvent(eventName)) {
    return apiOk({ received: true });
  }

  // Our grants name exactly one room and `/api/token` sets it from a validated
  // code, so nothing else can create a room here. A name that fails the shape check
  // is therefore not something a retry will fix.
  const roomCode = event.room?.name;
  if (!roomCode || !isValidRoomCode(roomCode)) {
    console.warn('[api/livekit/webhook] event names no valid room code', eventName, roomCode);
    return apiOk({ received: true });
  }

  try {
    // Throws on a database error rather than returning null, which matters here: an
    // outage must fall through to the 500 below and be redelivered, not be mistaken
    // for a meeting that does not exist and silently dropped.
    const meeting = await findMeetingByCode(roomCode);
    if (!meeting) {
      console.warn('[api/livekit/webhook] no meeting for room code', roomCode);
      return apiOk({ received: true });
    }

    // Only ever a fallback for an absent LiveKit timestamp; see `eventTimestampIso`.
    const now = new Date();

    switch (eventName) {
      case 'participant_joined':
        await handleParticipantJoined(event, meeting.id, now);
        break;

      case 'participant_left':
        await handleParticipantLeft(event, meeting.id, now);
        break;

      case 'room_finished':
        // No guard of its own: the event names a room, not a participant.
        await closeMeeting({
          meetingId: meeting.id,
          endedAt: eventTimestampIso(event.createdAt, now),
        });
        break;
    }

    return apiOk({ received: true });
  } catch (error) {
    // Loud on purpose. Call history is a stated success criterion, so a failed write
    // is worth a retry — and the handlers are idempotent, which makes the retry free.
    console.error('[api/livekit/webhook] handler failed', eventName, error);
    return apiError('handler_failed', 'Event could not be processed.', 500);
  }
}
