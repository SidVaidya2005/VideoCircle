'use client';

import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import { useCallback, useRef, useState } from 'react';

import type { ChatKeyState } from '@/hooks/use-chat-key';
import { DATA_TOPIC } from '@/lib/constants';
import { decryptChatMessage, encryptChatMessage } from '@/lib/crypto/chat-message';

interface ChatMessageBase {
  /** Unique per entry. Never derived from `sentAt`, which the sender controls. */
  id: string;
  identity: string;
  /** Snapshot taken when the message lands, so a sender who leaves keeps their name. */
  name: string;
  isLocal: boolean;
  /**
   * Local arrival time, and the only clock this transcript trusts. The envelope's
   * `sentAt` is validated and then deliberately unused: ordering or displaying by
   * it would let one misconfigured peer reorder everyone's transcript.
   */
  receivedAt: number;
}

export type ChatMessage =
  | (ChatMessageBase & { status: 'sent' | 'failed'; body: string })
  | (ChatMessageBase & { status: 'unreadable' });

export interface EncryptedChat {
  messages: readonly ChatMessage[];
  /** Resolves once the message is on the channel, or recorded as failed. */
  send: (body: string) => Promise<void>;
}

/**
 * Chat over the LiveKit data channel, encrypted end to end in the browser.
 *
 * The SFU relays bytes it cannot read: everything on `vc.chat` is the output of
 * `encryptChatMessage`, and plaintext is never handed to `publishData`.
 *
 * Lives above the panel because `CallPanel` unmounts its children when closed —
 * a hook inside the panel would stop receiving the moment somebody closed it.
 */
export function useEncryptedChat(chatKey: ChatKeyState): EncryptedChat {
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);

  // Decryption is asynchronous, so two payloads arriving back to back can resolve
  // in either order and land in the transcript reversed. Chaining each onto the
  // last keeps append order equal to arrival order, which is the order this
  // transcript is defined by.
  const tail = useRef<Promise<void>>(Promise.resolve());

  const append = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  useDataChannel(DATA_TOPIC.CHAT, (message) => {
    // `from` is undefined once the sender has left. Their name is the thing this
    // entry would be attributed to, and there is nothing to attribute it to.
    if (!message.from) return;

    // Without a key there is nothing to decrypt and nothing useful to show. The
    // panel already explains that this link cannot read chat; a column of
    // placeholders underneath that explanation is noise, not information.
    if (chatKey.status !== 'ready') return;

    const { key } = chatKey;
    const { identity, name } = message.from;
    const payload = message.payload;

    tail.current = tail.current.then(async () => {
      const base = {
        id: crypto.randomUUID(),
        identity,
        name: name ?? '',
        isLocal: false,
        receivedAt: Date.now(),
      };

      try {
        const { body } = await decryptChatMessage(key, identity, payload);
        append({ ...base, status: 'sent', body });
      } catch {
        // Tampered, encrypted under a different key, replayed under another name,
        // or well-formed JSON of the wrong shape — all the same to a reader, and
        // all of them an entry rather than a throw into the render tree.
        append({ ...base, status: 'unreadable' });
      }
    });
  });

  const send = useCallback(
    async (body: string) => {
      if (chatKey.status !== 'ready') return;

      const trimmed = body.trim();
      if (!trimmed) return;

      const base = {
        id: crypto.randomUUID(),
        identity: localParticipant.identity,
        name: localParticipant.name ?? '',
        isLocal: true,
        receivedAt: Date.now(),
        body: trimmed,
      };

      try {
        const packed = await encryptChatMessage(chatKey.key, localParticipant.identity, {
          body: trimmed,
          sentAt: Date.now(),
        });

        // Reliable and ordered: a chat message that arrives late is still worth
        // having, and one that never arrives is a broken conversation. This is
        // the opposite call from reactions, where a drop costs nothing.
        await localParticipant.publishData(packed, {
          topic: DATA_TOPIC.CHAT,
          reliable: true,
        });

        // Appended after the publish resolves, and appended by us: LiveKit does
        // not deliver your own data messages back to you.
        append({ ...base, status: 'sent' });
      } catch (error) {
        // Kept, not dropped. Something typed and sent must never simply vanish,
        // and `reliable: true` can genuinely reject.
        console.warn('[room/chat] message could not be sent', error);
        append({ ...base, status: 'failed' });
      }
    },
    [append, chatKey, localParticipant],
  );

  return { messages, send };
}
