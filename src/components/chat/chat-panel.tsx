'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatKeyState } from '@/hooks/use-chat-key';
import type { ChatMessage } from '@/hooks/use-encrypted-chat';
import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants';

interface ChatPanelProps {
  chatKey: ChatKeyState;
  messages: readonly ChatMessage[];
  onSend: (body: string) => Promise<void>;
}

/** Matches the tile and the participant list: never an identity, which is not ours to show. */
const UNNAMED = 'Guest';

/**
 * Why this link cannot read chat, and what fixes it.
 *
 * Says the same thing as the invite dialog's no-key note, from the other side: one
 * warns the person about to pass a stripped link on, this one explains it to
 * whoever received it. Neither names a fragment, a key, or a URL part — the only
 * action available is to go back to whoever sent the link.
 *
 * Not styled as an error. Nothing failed: the call is working and one part of it
 * is unavailable, which is a state, not a fault.
 */
function ChatUnavailableNotice() {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
        Chat unavailable
      </p>
      <p className="text-ink-2 text-sm leading-normal">
        The link you opened does not carry this meeting&rsquo;s chat key, so messages here cannot be
        read on this device.
      </p>
      <p className="text-faint text-xs leading-normal">
        Ask whoever invited you to send the original link again, unchanged. Everything else in the
        call works as normal.
      </p>
    </div>
  );
}

function ChatEntry({ message }: { message: ChatMessage }) {
  const name = message.isLocal ? 'You' : message.name.trim() || UNNAMED;

  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-muted text-xs tracking-wider uppercase">{name}</span>

      {message.status === 'unreadable' ? (
        // Kept in place rather than dropped: a gap in a conversation is worse
        // than a marked one, and this is what tampering or a mismatched key looks
        // like from the reader's side.
        <span className="text-faint text-sm leading-normal italic">Unreadable message</span>
      ) : (
        <span className="text-ink text-sm leading-normal break-words">
          {message.body}
          {message.status === 'failed' ? (
            <span className="text-faint text-xs tracking-wider uppercase"> · not sent</span>
          ) : null}
        </span>
      )}
    </li>
  );
}

/**
 * The chat panel.
 *
 * F18's composer is deliberately plain — an input and a button, enough to put a
 * message on the wire and prove nothing readable goes with it. F19 adds Enter and
 * Shift+Enter, own-message alignment, relative timestamps, the unread badge and
 * auto-scroll on top of this, and gates its composer on the same `status`.
 */
export function ChatPanel({ chatKey, messages, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');

  if (chatKey.status === 'loading') return null;

  if (chatKey.status === 'missing') return <ChatUnavailableNotice />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    // Cleared immediately rather than on resolve: the send is awaited only to
    // record whether it landed, and holding the field hostage to the network
    // makes a fast conversation feel broken.
    setDraft('');
    void onSend(body);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {messages.length === 0 ? (
        <p className="text-faint text-xs leading-normal">
          No messages yet. Chat is encrypted in your browser and nothing is stored — the transcript
          disappears when you leave.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {messages.map((message) => (
            <ChatEntry key={message.id} message={message} />
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-none items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // A courtesy to the person typing. The rule is ChatPlaintextSchema,
          // which refuses to encrypt anything longer.
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          aria-label="Message"
          placeholder="Message"
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
