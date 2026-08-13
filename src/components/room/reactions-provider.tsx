'use client';

import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { HAND_ATTRIBUTE, HAND_RAISED, useIsHandRaised } from '@/hooks/use-raise-hand';
import { DATA_TOPIC, REACTION_TTL_MS } from '@/lib/constants';
import {
  decodeReaction,
  encodeReaction,
  shouldAcceptReaction,
  type ReactionLabel,
} from '@/lib/reactions';

interface ActiveReaction {
  /** Unique per firing, so two of the same label in a row are two elements. */
  id: string;
  label: ReactionLabel;
}

interface ReactionsValue {
  /** Keyed by participant identity. A tile reads only its own entry. */
  active: Readonly<Record<string, ActiveReaction>>;
  send: (label: ReactionLabel) => void;
  /** Your own hand, held here rather than read back from the attribute. */
  handRaised: boolean;
  toggleHand: () => void;
}

const ReactionsContext = createContext<ReactionsValue | null>(null);

/**
 * Incoming and outgoing reactions for the whole call.
 *
 * A context rather than props: the alternative threads through `VideoGrid`,
 * `FocusLayout` and the filmstrip, and hands every memoised tile a new object
 * whenever anyone anywhere reacts — the exact cost the tile memo exists to avoid.
 * Reading here is per-identity, so a tile subscribes to one entry.
 *
 * Raised hands live here too, but only your own: everyone else's is read from
 * their participant attribute, per participant, where it is shown.
 */
export function ReactionsProvider({ children }: { children: React.ReactNode }) {
  const { localParticipant } = useLocalParticipant();
  const [active, setActive] = useState<Record<string, ActiveReaction>>({});

  // Your own hand is local state; everyone else's is read from their attribute.
  // LiveKit does not echo an attribute change back to the participant who made
  // it while they are alone in the room — verified — so reading your own hand
  // from the attribute leaves the button label and the badge unchanged until
  // somebody else arrives, which is a control that appears dead.
  //
  // Unlike the screen-share state this deliberately does not mirror, nothing but
  // this toggle can change it: there is no equivalent of the browser's own stop
  // bar for a raised hand, so a local copy has nothing to drift against. A failed
  // attribute write is the one gap, and it is rarer than the case it fixes.
  const [handRaised, setHandRaised] = useState(false);

  const toggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    // An empty string rather than a delete: setAttributes merges, so a key can
    // only be emptied, and an empty value reads as "not raised" everywhere.
    void localParticipant.setAttributes({ [HAND_ATTRIBUTE]: next ? HAND_RAISED : '' });
  }, [handRaised, localParticipant]);

  // Last accepted time per identity, including our own. A ref because nothing
  // renders from it and a re-render per message is what this is avoiding.
  const lastAcceptedAt = useRef<Map<string, number>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback((identity: string, label: ReactionLabel) => {
    const now = Date.now();
    // Enforced again on arrival, not only in the sender. A limit that lives in
    // the sender's own client proves nothing about a peer we do not control.
    if (!shouldAcceptReaction(lastAcceptedAt.current.get(identity), now)) return;
    lastAcceptedAt.current.set(identity, now);

    setActive((current) => ({ ...current, [identity]: { id: `${identity}:${now}`, label } }));

    const existing = timers.current.get(identity);
    if (existing) clearTimeout(existing);

    timers.current.set(
      identity,
      setTimeout(() => {
        timers.current.delete(identity);
        setActive((current) => {
          if (!(identity in current)) return current;

          // Rebuilt rather than destructured-and-discarded: the discard names a
          // binding nothing reads, which the linter is right to object to.
          const rest = { ...current };
          delete rest[identity];
          return rest;
        });
      }, REACTION_TTL_MS),
    );
  }, []);

  useDataChannel(DATA_TOPIC.REACTION, (message) => {
    // `from` is undefined when the sender has already left; there is no tile to
    // put their reaction over, so there is nothing to do with it.
    if (!message.from) return;

    const payload = decodeReaction(message.payload);
    if (!payload) return;

    show(message.from.identity, payload.label);
  });

  const send = useCallback(
    (label: ReactionLabel) => {
      const identity = localParticipant.identity;
      if (!shouldAcceptReaction(lastAcceptedAt.current.get(identity), Date.now())) return;

      // Unreliable on purpose: a lost reaction costs nothing, and the channel
      // should never spend a retransmit on one.
      void localParticipant.publishData(encodeReaction(label), {
        topic: DATA_TOPIC.REACTION,
        reliable: false,
      });

      // Shown locally rather than waiting for an echo — LiveKit does not deliver
      // your own data messages back to you.
      show(identity, label);
    },
    [localParticipant, show],
  );

  // Timers outlive a fast unmount otherwise, and each one calls setState.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return (
    <ReactionsContext value={{ active, send, handRaised, toggleHand }}>{children}</ReactionsContext>
  );
}

export function useReactions(): ReactionsValue {
  const value = useContext(ReactionsContext);
  if (!value) throw new Error('useReactions must be used inside <ReactionsProvider>');
  return value;
}

/** The reaction currently showing for one participant, if any. */
export function useParticipantReaction(identity: string): ActiveReaction | undefined {
  return useReactions().active[identity];
}

/**
 * Whether this participant's hand is up, from whichever source is authoritative:
 * local state for yourself, the synced attribute for everyone else.
 */
export function useHandRaised(participant: Participant): boolean {
  const { handRaised } = useReactions();
  const remoteRaised = useIsHandRaised(participant);
  return participant.isLocal ? handRaised : remoteRaised;
}
