import 'server-only';

import { WebhookReceiver } from 'livekit-server-sdk';

import { livekitEnv } from '@/lib/env.livekit.server';

/**
 * Verifies that a webhook really came from LiveKit.
 *
 * `receive()` checks the JWT in the `Authorization` header and compares its
 * `sha256` claim against a digest of the body it is handed — so it must be handed
 * the exact bytes that arrived. Parsing the request as JSON first changes them
 * (key order, whitespace, number formatting) and the comparison fails on a
 * perfectly genuine event.
 *
 * The second consumer of the LiveKit signing secret, after `token.ts`. Both are
 * `server-only`; this file exists so the receiver is constructed once rather than
 * per request, and so the route handler holds no credential of its own.
 */
export const webhookReceiver = new WebhookReceiver(
  livekitEnv.LIVEKIT_API_KEY,
  livekitEnv.LIVEKIT_API_SECRET,
);
