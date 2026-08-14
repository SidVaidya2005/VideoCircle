'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ChatKeyState } from '@/hooks/use-chat-key';
import type { ChatMessage } from '@/hooks/use-encrypted-chat';
import { formatChatTime } from '@/lib/chat-time';
import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  chatKey: ChatKeyState;
  messages: readonly ChatMessage[];
  onSend: (body: string) => Promise<void>;
}

/** Matches the tile and the participant list: never an identity, which is not ours to show. */
const UNNAMED = 'Guest';

/** Within this of the floor, the list follows new messages. Above it, it holds still. */
const NEAR_BOTTOM_PX = 64;

/** Relative times are minute-grained, so anything faster is a re-render for nothing. */
const TICK_MS = 60_000;

/** Five rows of the composer, after which it scrolls rather than growing further. */
const MAX_COMPOSER_PX = 132;

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

function ChatEntry({ message, now }: { message: ChatMessage; now: number }) {
  const name = message.isLocal ? 'You' : message.name.trim() || UNNAMED;

  return (
    <li className={cn('flex flex-col gap-1', message.isLocal && 'items-end')}>
      <span className="text-muted flex items-baseline gap-2 text-xs tracking-wider uppercase">
        <span className="truncate">{name}</span>
        <span className="text-faint">{formatChatTime(message.receivedAt, now)}</span>
      </span>

      {message.status === 'unreadable' ? (
        // Kept in place rather than dropped: a gap in a conversation is worse than
        // a marked one, and this is what tampering or a mismatched key looks like
        // from the reader's side.
        <span className="text-faint text-sm leading-normal italic">Unreadable message</span>
      ) : (
        <span
          className={cn(
            // Only your own messages carry a fill. The panel is already bg-card,
            // so filling both sides would flatten the distinction rather than
            // draw it.
            'text-ink max-w-[85%] text-sm leading-normal break-words whitespace-pre-wrap',
            message.isLocal && 'bg-raised rounded-md px-3 py-2',
          )}
        >
          {message.body}
          {message.status === 'failed' ? (
            <span className="text-faint block text-xs tracking-wider uppercase">not sent</span>
          ) : null}
        </span>
      )}
    </li>
  );
}

/**
 * The chat panel: transcript above, composer below.
 *
 * Everything here lives in component state and nothing is written anywhere —
 * reloading clears the conversation, which is the design rather than a limitation.
 * The server could not store these even if it wanted to; it never sees plaintext.
 */
export function ChatPanel({ chatKey, messages, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  // Ticks so relative times stay honest. One interval for the whole panel, and
  // CallPanel unmounts this when chat is closed, so nothing ticks in a call where
  // nobody opened it.
  const [now, setNow] = useState(() => Date.now());

  const listRef = useRef<HTMLUListElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Whether the list was near the floor *before* this render's messages landed.
  // Read after the fact it would always say no, and the list would never follow
  // anything. A ref rather than state: nothing renders from it.
  const nearBottom = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Layout effect, so the jump happens in the same frame the message appears
  // rather than as a visible scroll afterwards.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !nearBottom.current) return;

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  function trackScroll(event: React.UIEvent<HTMLUListElement>) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    nearBottom.current = scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_PX;
  }

  function resizeComposer() {
    const field = composerRef.current;
    if (!field) return;

    // Reset first: without it the field only ever grows, since scrollHeight can
    // never report less than the height already set.
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, MAX_COMPOSER_PX)}px`;
  }

  function submit() {
    const body = draft.trim();
    if (!body) return;

    // Cleared immediately rather than on resolve: the send is awaited only to
    // record whether it landed, and holding the field hostage to the network
    // makes a fast conversation feel broken.
    setDraft('');
    // Back to one row, since the value it was sized for is gone.
    requestAnimationFrame(resizeComposer);
    void onSend(body);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;

    // An IME composing a character uses Enter to commit it. Sending there would
    // dispatch a half-typed word in any language that needs one.
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  }

  if (chatKey.status === 'loading') return null;

  if (chatKey.status === 'missing') return <ChatUnavailableNotice />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {messages.length === 0 ? (
        <p className="text-faint flex-1 text-xs leading-normal">
          No messages yet. Chat is encrypted in your browser and nothing is stored — the transcript
          disappears when you leave.
        </p>
      ) : (
        <ul
          ref={listRef}
          onScroll={trackScroll}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        >
          {messages.map((message) => (
            <ChatEntry key={message.id} message={message} now={now} />
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-none items-end gap-2"
      >
        <Textarea
          ref={composerRef}
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            resizeComposer();
          }}
          onKeyDown={handleKeyDown}
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
