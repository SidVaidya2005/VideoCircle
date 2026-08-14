import { DisconnectReason } from 'livekit-client';

/**
 * What a disconnect means, and what to tell the person it happened to.
 *
 * Pure and free of `server-only`, so every branch is testable without a room —
 * the same split `meeting-state.ts` and `token-ttl.ts` make. The room tree does
 * the IO and hands the reason here.
 *
 * No message names a reason code, a provider, or a connection layer. A person
 * whose call just ended needs to know whether to try again, not which enum member
 * the SDK chose.
 */

export interface DisconnectDescription {
  /** Wide-tracked CAPS overline, per the kit. */
  title: string;
  /** One or two plain sentences saying what happened and what is worth doing. */
  message: string;
  /** Whether trying the same link again could plausibly work. */
  rejoinable: boolean;
}

/**
 * Whether the participant ended the call themselves.
 *
 * **`reason` is optional AND `UNKNOWN_REASON` is `0`.** A truthiness check —
 * `if (!reason)` — therefore reads both "no reason given" and "reason unknown" as
 * a deliberate leave, which is the commonest involuntary drop of all. It has to be
 * an explicit comparison, and the enum member has to be named.
 */
export function isDeliberateLeave(reason: DisconnectReason | undefined): boolean {
  return reason === DisconnectReason.CLIENT_INITIATED;
}

const LOST_CONNECTION: DisconnectDescription = {
  title: 'Call ended',
  message:
    'The connection to this meeting was lost and could not be recovered. If the meeting is still running, you can rejoin it.',
  rejoinable: true,
};

/**
 * The reason, as something a person can act on.
 *
 * Every member is handled explicitly, and the `default` exists to *prove* that:
 * assigning `reason` to `never` fails to compile the moment the SDK adds a member
 * this switch does not name. **A switch with no `default` does not give you that**
 * — `noImplicitReturns` is off, so an unhandled member returns `undefined` and the
 * notice renders blank in a call that has just dropped. That is not hypothetical:
 * this function was first written against a truncated read of the enum, missed
 * four members, and the unit test caught it where the compiler did not.
 */
export function describeDisconnect(reason: DisconnectReason | undefined): DisconnectDescription {
  switch (reason) {
    case DisconnectReason.DUPLICATE_IDENTITY:
      // Only reachable for a signed-in participant: their identity is
      // `user:<uuid>` and is the same in every tab. A guest gets a fresh
      // `guest:<uuid>` per join and can never collide with themselves.
      return {
        title: 'Joined elsewhere',
        message:
          'You joined this meeting again somewhere else, so this window was disconnected. Only one window at a time can be in a meeting.',
        rejoinable: true,
      };

    case DisconnectReason.PARTICIPANT_REMOVED:
      // Host moderation is out of scope, so nothing in this product produces
      // this. It stays handled because the server can still send it, and a
      // removed participant told "the connection was lost" would keep rejoining.
      return {
        title: 'Removed from the meeting',
        message: 'You were removed from this meeting.',
        rejoinable: false,
      };

    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
      return {
        title: 'Meeting ended',
        message: 'This meeting has ended. The link will not open a new one.',
        rejoinable: false,
      };

    case DisconnectReason.JOIN_FAILURE:
      return {
        title: 'Could not join',
        message: 'The meeting could not be joined. Check your connection and try again.',
        rejoinable: true,
      };

    case DisconnectReason.USER_UNAVAILABLE:
    case DisconnectReason.USER_REJECTED:
    case DisconnectReason.SIP_TRUNK_FAILURE:
    case DisconnectReason.AGENT_ERROR:
      // SIP and agent dispatch, neither of which this product uses. Named rather
      // than defaulted so the `never` check below stays meaningful.
      return LOST_CONNECTION;

    // Everything below is genuinely "the connection went away": a server
    // restarting, the signal socket closing, a state mismatch after a failed
    // resume, a migration between nodes, the connection timing out, media
    // transport failing, no reason at all. CONNECTION_TIMEOUT and MEDIA_FAILURE
    // are the two most likely to be seen in this product and are deliberately
    // not given copy of their own: they differ in cause, not in what the person
    // can do about it, and naming the cause would be telling them about our
    // plumbing rather than their call.
    case DisconnectReason.SERVER_SHUTDOWN:
    case DisconnectReason.STATE_MISMATCH:
    case DisconnectReason.MIGRATION:
    case DisconnectReason.SIGNAL_CLOSE:
    case DisconnectReason.CONNECTION_TIMEOUT:
    case DisconnectReason.MEDIA_FAILURE:
    case DisconnectReason.UNKNOWN_REASON:
    case DisconnectReason.CLIENT_INITIATED:
    case undefined:
      return LOST_CONNECTION;

    default: {
      // Compile-time exhaustiveness. If the SDK adds a member, `reason` stops
      // being `never` here and this line fails the build — which is the whole
      // point, since nothing else would.
      const unhandled: never = reason;
      void unhandled;
      return LOST_CONNECTION;
    }
  }
}
