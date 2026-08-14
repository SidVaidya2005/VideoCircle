'use client';

import type { ChatKeyState } from '@/hooks/use-chat-key';

interface ChatPanelProps {
  chatKey: ChatKeyState;
}

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

/**
 * The chat panel.
 *
 * F17 builds the shell and the two states the key can be in; the message list and
 * composer arrive at F19 and gate on this same `status`. Rendering nothing while
 * `loading` is deliberate — the import settles well before the panel can be opened,
 * so a spinner here would only ever appear when something is wrong.
 */
export function ChatPanel({ chatKey }: ChatPanelProps) {
  if (chatKey.status === 'loading') return null;

  if (chatKey.status === 'missing') return <ChatUnavailableNotice />;

  return (
    <p className="text-faint text-xs leading-normal">
      No messages yet. Chat is encrypted in your browser and nothing is stored — the transcript
      disappears when you leave.
    </p>
  );
}
