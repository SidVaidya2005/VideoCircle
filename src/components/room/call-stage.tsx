'use client';

import { useParticipants, useRoomContext } from '@livekit/components-react';
import { useState } from 'react';

import { ChatPanel } from '@/components/chat/chat-panel';
import { CallPanel } from '@/components/room/call-panel';
import { CallStatus } from '@/components/room/call-status';
import { ControlBar, type CallPanelName } from '@/components/room/control-bar';
import { ParticipantList } from '@/components/room/participant-list';
import { ReactionsProvider } from '@/components/room/reactions-provider';
import { VideoGrid } from '@/components/room/video-grid';
import { useChatKey } from '@/hooks/use-chat-key';
import { useEncryptedChat } from '@/hooks/use-encrypted-chat';

/**
 * The call: status pinned top, grid between, controls pinned bottom.
 *
 * The tree never unmounts on a reconnect. Tearing the grid down would drop every
 * attached video element, and adaptiveStream would have to rebuild its
 * subscriptions from nothing once the signal came back — a transient blip
 * rendered as a full rejoin.
 */
interface CallStageProps {
  /** The room code, for the invite link. Passed rather than read off the Room. */
  code: string;
}

export function CallStage({ code }: CallStageProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  // Read here rather than inside the panel: this mounts at join, so the import is
  // settled long before anyone opens chat, whereas CallPanel unmounts its children
  // when closed and would re-import on every open.
  const chatKey = useChatKey();
  // Above the panel, not inside it: CallPanel unmounts its children when closed,
  // and a transcript that stops receiving the moment someone closes chat is not a
  // transcript.
  const chat = useEncryptedChat(chatKey);

  // One value, so only one panel can ever be open — the only workable behaviour
  // on a phone, and it keeps two panels from competing for the right column on a
  // desktop.
  const [openPanel, setOpenPanel] = useState<CallPanelName | null>(null);

  // How much of the transcript had arrived last time chat was opened or closed.
  // An index rather than a timestamp: two messages can share a millisecond with
  // the stamp, and then whether they count is a coin toss.
  const [chatSeenCount, setChatSeenCount] = useState(0);

  // Stamped in the handlers rather than an effect. A setState in an effect body
  // is an error here — the rule that reshaped useChatKey at F17 — and the two
  // moments that matter are both already handlers.
  function markChatSeen() {
    setChatSeenCount(chat.messages.length);
  }

  function togglePanel(panel: CallPanelName) {
    setOpenPanel((current) => (current === panel ? null : panel));
    if (panel === 'chat') markChatSeen();
  }

  function closePanel(panel: CallPanelName) {
    setOpenPanel(null);
    if (panel === 'chat') markChatSeen();
  }

  // Your own messages are never unread, and an unreadable entry is: something
  // arrived, which is all the badge claims.
  const unreadChat =
    openPanel === 'chat'
      ? 0
      : chat.messages.slice(chatSeenCount).filter((message) => !message.isLocal).length;

  return (
    <ReactionsProvider>
      <div className="flex min-h-0 flex-1 flex-col gap-4 pb-3">
        <div className="flex flex-none items-center justify-between gap-4">
          <CallStatus />
        </div>

        <div className="flex min-h-0 flex-1 gap-3">
          {/* The panel takes the right column and the filmstrip falls back to
            horizontal, so only one column of chrome occupies that edge. */}
          <VideoGrid sidePanelOpen={openPanel !== null} />

          <CallPanel
            title="Participants"
            open={openPanel === 'participants'}
            onClose={() => closePanel('participants')}
          >
            <ParticipantList />
          </CallPanel>

          <CallPanel title="Chat" open={openPanel === 'chat'} onClose={() => closePanel('chat')}>
            <ChatPanel chatKey={chatKey} messages={chat.messages} onSend={chat.send} />
          </CallPanel>
        </div>

        {/* Nothing here is disabled while reconnecting — that is exactly when the
          controls are reached for. */}
        <ControlBar
          onLeave={() => void room.disconnect()}
          code={code}
          openPanel={openPanel}
          onTogglePanel={togglePanel}
          participantCount={participants.length}
          unreadChat={unreadChat}
        />
      </div>
    </ReactionsProvider>
  );
}
