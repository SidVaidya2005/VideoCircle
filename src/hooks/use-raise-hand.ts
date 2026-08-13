'use client';

import { useParticipantAttribute } from '@livekit/components-react';
import type { Participant } from 'livekit-client';

/**
 * The attribute key a raised hand lives under. One string, shared by the writer
 * and every reader, so a typo cannot make a hand invisible to half the room.
 */
export const HAND_ATTRIBUTE = 'vc.hand';

/** Attributes are `Record<string, string>`, so the raised state is a literal. */
export const HAND_RAISED = '1';

/**
 * Whether this participant's hand is up.
 *
 * Reads a participant attribute rather than a data-channel message, and that is
 * the whole point: an attribute is durable. It survives a dropped packet, and
 * LiveKit syncs it to anyone who joins *after* the hand went up — a case the data
 * channel cannot serve at all, since its messages exist only in flight.
 *
 * Per participant, matching the rule that a tile subscribes to its own
 * participant and nothing room-wide.
 */
export function useIsHandRaised(participant: Participant): boolean {
  return useParticipantAttribute(HAND_ATTRIBUTE, { participant }) === HAND_RAISED;
}

/**
 * Note the asymmetry, and where the other half lives.
 *
 * This reads a *remote* participant's hand. Your own is held as local state in
 * `ReactionsProvider`, and `useHandRaised` there is what picks between the two.
 * LiveKit does not echo an attribute change back to the participant who made it
 * while they are alone in the room — verified — so reading your own hand from
 * the attribute would leave the button label and the badge unchanged until
 * somebody else arrived, which is a control that appears dead.
 */
