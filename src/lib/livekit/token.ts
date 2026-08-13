import 'server-only';

import { AccessToken, type VideoGrant } from 'livekit-server-sdk';

import { livekitEnv } from '@/lib/env.livekit.server';
import { tokenTtlSeconds } from '@/lib/livekit/token-ttl';

interface MintParams {
  roomCode: string;
  identity: string;
  displayName: string;
  /** `meetings.expires_at`, already checked to be in the future. */
  expiresAt: Date;
}

/**
 * The only place a LiveKit token is signed. The browser never constructs,
 * signs, or extends one.
 */
export async function mintAccessToken(params: MintParams): Promise<string> {
  const at = new AccessToken(livekitEnv.LIVEKIT_API_KEY, livekitEnv.LIVEKIT_API_SECRET, {
    // The join/leave correlation key our webhooks match on. Never a display name,
    // which is neither unique nor stable.
    identity: params.identity,
    name: params.displayName,
    ttl: tokenTtlSeconds(params.expiresAt, new Date()),
  });

  // Exactly one room, and no administrative capability. `roomAdmin`, `roomCreate`
  // and `roomList` are never set: this product has no moderation features, and a
  // wildcard grant would let any token holder walk into any meeting.
  const grant: VideoGrant = {
    room: params.roomCode,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // chat and reactions
    // Raise-hand is a participant attribute rather than a data-channel message,
    // because only an attribute is durable: it survives a dropped packet and is
    // synced to anyone who joins after the hand went up. Writing one needs this
    // claim. It lets a client describe *itself* and nothing else — it grants no
    // authority over the room or over anyone else in it.
    canUpdateOwnMetadata: true,
  };
  at.addGrant(grant);

  // Asynchronous in v2. A forgotten await yields "[object Promise]" as the token
  // and fails at connect time with an opaque error.
  return at.toJwt();
}
