import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/api';
import { MAX_DISPLAY_NAME_LENGTH } from '@/lib/constants';
import { env } from '@/lib/env';
import { mintAccessToken } from '@/lib/livekit/token';
import { meetingJoinability } from '@/lib/meeting-state';
import { findMeetingByCode } from '@/lib/meetings';
import { isValidRoomCode } from '@/lib/room-code';
import { createClient } from '@/lib/supabase/server';

const BodySchema = z.object({
  code: z.string().refine(isValidRoomCode, 'Invalid room code'),
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LENGTH),
});

/**
 * Mints a LiveKit access token for one meeting.
 *
 * **A well-formed code is not authorization.** The meeting must exist and still be
 * joinable, checked here rather than trusted from the page that rendered the
 * lobby: this endpoint is directly callable, and the meeting can close while
 * someone sits in the lobby deciding.
 */
export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Never echo the validation error: it would describe our schema to a caller
    // who has no business knowing it.
    return apiError('invalid_request', 'Room code and display name are required.', 400);
  }

  try {
    const meeting = await findMeetingByCode(parsed.data.code);
    if (!meeting) {
      return apiError('not_found', 'That meeting does not exist.', 404);
    }

    switch (meetingJoinability(meeting, new Date())) {
      case 'ended':
        return apiError('meeting_ended', 'This meeting has ended.', 410);
      case 'expired':
        return apiError('meeting_expired', 'This meeting link has expired.', 410);
      case 'open':
        break;
    }

    // A null user is a guest, which is the normal case here, not an error. The
    // identity prefix is what the participation webhook later reads a user id
    // back out of, so it is generated here and never accepted from the client.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const identity = user ? `user:${user.id}` : `guest:${crypto.randomUUID()}`;

    const token = await mintAccessToken({
      roomCode: parsed.data.code,
      identity,
      displayName: parsed.data.displayName,
      expiresAt: new Date(meeting.expires_at),
    });

    return apiOk({ serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL, token, identity });
  } catch (error) {
    console.error('[api/token] failed to mint token', error);
    return apiError('token_failed', 'Could not join the meeting. Please try again.', 500);
  }
}
