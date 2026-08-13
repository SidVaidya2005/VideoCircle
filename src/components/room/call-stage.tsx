'use client';

import { useParticipants, useRoomContext } from '@livekit/components-react';
import { useState } from 'react';

import { CallPanel } from '@/components/room/call-panel';
import { CallStatus } from '@/components/room/call-status';
import { ControlBar, type CallPanelName } from '@/components/room/control-bar';
import { ParticipantList } from '@/components/room/participant-list';
import { ReactionsProvider } from '@/components/room/reactions-provider';
import { VideoGrid } from '@/components/room/video-grid';

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

  // One value, so only one panel can ever be open — the only workable behaviour
  // on a phone, and it keeps two panels from competing for the right column on a
  // desktop. Feature 19 adds a variant here, not a mechanism.
  const [openPanel, setOpenPanel] = useState<CallPanelName | null>(null);

  function togglePanel(panel: CallPanelName) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

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
            onClose={() => setOpenPanel(null)}
          >
            <ParticipantList />
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
        />
      </div>
    </ReactionsProvider>
  );
}
