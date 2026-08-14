'use client';

import type { DisconnectReason } from 'livekit-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { JoinFailureNotice } from '@/components/lobby/join-failure-notice';
import { LobbyControls } from '@/components/lobby/lobby-controls';
import { MediaStateNotice } from '@/components/lobby/media-state-notice';
import { SelfPreview } from '@/components/lobby/self-preview';
import { CallStage } from '@/components/room/call-stage';
import { DisconnectNotice } from '@/components/room/disconnect-notice';
import { RoomShell } from '@/components/room/room-shell';
import { SectionOverline } from '@/components/ui/section-overline';
import { useMediaPreview } from '@/hooks/use-media-preview';
import { restoreChatKeyFragment } from '@/lib/auth/sign-in';
import { isDeliberateLeave } from '@/lib/livekit/disconnect-reason';
import { requestToken, type TokenGrant } from '@/lib/livekit/request-token';

interface RoomExperienceProps {
  code: string;
  /** From `profiles`, resolved server-side. Null for a guest. */
  profileName: string | null;
}

type JoinState =
  | { phase: 'lobby' }
  | { phase: 'joining' }
  | { phase: 'joined'; grant: TokenGrant }
  | { phase: 'failed'; code: string; message: string }
  /** The call ended without anyone here choosing it. `reason` is genuinely optional. */
  | { phase: 'dropped'; reason: DisconnectReason | undefined };

function previewPlaceholder(busy: boolean, enabled: boolean, failed: boolean): string {
  if (busy) return 'Starting camera';
  if (!enabled) return 'Camera off';
  if (failed) return 'Camera unavailable';
  return 'No camera';
}

/**
 * Host for everything at `/room/[code]`.
 *
 * Lobby and call live in one component rather than two routes: navigating between
 * them would unmount the tree and tear down the local media, which is the one
 * thing that has to survive the transition.
 */
export function RoomExperience({ code, profileName }: RoomExperienceProps) {
  const router = useRouter();
  const preview = useMediaPreview();
  // Seeded once. A signed-in name arrives with the server render, so there is no
  // moment where the field is empty and then fills in.
  const [displayName, setDisplayName] = useState(profileName ?? '');
  const [join, setJoin] = useState<JoinState>({ phase: 'lobby' });

  // Puts back a chat key stashed before a sign-in round trip, which strips the
  // fragment. Here rather than in the call tree, and that ordering is the point:
  // this runs when the lobby mounts, while `useChatKey` runs when CallStage mounts
  // — behind a click on Join, and so always afterwards. React runs child effects
  // before parent ones, so a restore living any deeper would race the read.
  useEffect(() => {
    restoreChatKeyFragment();
  }, []);

  const { camera, microphone, blockingFailure } = preview;

  async function handleJoin() {
    setJoin({ phase: 'joining' });

    const result = await requestToken(code, displayName.trim());

    if (!result.ok) {
      setJoin({ phase: 'failed', code: result.code, message: result.message });
      return;
    }

    // Released before the room connects, never after: a live preview track holds
    // the camera the room is about to ask for. The on/off intent survives in
    // `camera.enabled` and is what gets carried in below.
    preview.stopPreview();
    setJoin({ phase: 'joined', grant: result.grant });
  }

  if (join.phase === 'joined') {
    return (
      // Full-bleed and no max-width: the line-length cap governs text, and the
      // video grid is the one thing code-standards lets run the full viewport.
      // dvh, never vh, so mobile browser chrome cannot crop the control row off
      // the bottom.
      //
      // Padding — including the display's safe-area insets on all four edges —
      // comes from `.call-surface` in globals.css, where the literals belong. It
      // was `px-3 pt-3 pb-[env(safe-area-inset-bottom)]` here, which paid only the
      // bottom inset and paid it in a viewport that never reported one.
      <main className="call-surface flex h-dvh flex-col">
        <RoomShell
          serverUrl={join.grant.serverUrl}
          token={join.grant.token}
          audio={microphone.enabled}
          video={camera.enabled}
          cameraId={camera.deviceId}
          microphoneId={microphone.deviceId}
          // Leaving returns Home, which is what project-overview.md describes —
          // but ONLY when leaving is what happened. Every disconnect used to land
          // here, so a call that dropped put you on the landing page with no way
          // to tell whether you had left or been dropped. `isDeliberateLeave`
          // compares the reason explicitly rather than testing it for truth:
          // the parameter is optional and `UNKNOWN_REASON` is `0`, so a
          // truthiness check reads the commonest involuntary drop as a leave.
          onDisconnected={(reason) => {
            if (isDeliberateLeave(reason)) {
              router.push('/');
              return;
            }
            setJoin({ phase: 'dropped', reason });
          }}
        >
          <CallStage code={code} />
        </RoomShell>
      </main>
    );
  }

  if (join.phase === 'dropped') {
    // Its own surface rather than a notice inside the lobby: the lobby's preview
    // was released at join and its acquiring effect runs on mount, so rendering
    // the lobby again would show a dead camera under a message about a dead call.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <DisconnectNotice reason={join.reason} />
      </main>
    );
  }

  const cameraFailedWhileOn = camera.enabled && !camera.track ? camera.failure : null;
  const micFailedWhileOn = microphone.enabled && !microphone.track ? microphone.failure : null;

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-4 py-6">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
        <SectionOverline>Lobby</SectionOverline>
        {/* Verbatim and lowercase — a room code is an identifier, not prose. */}
        <code className="text-ink-2 text-xs">{code}</code>
      </div>

      {/* mt-auto below pushes the controls toward the bottom on a tall screen, so
          the things you actually press stay within one-handed reach on a phone. */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5">
        <div className="border-line/60 bg-canvas animate-tile-in relative aspect-video w-full overflow-hidden rounded-lg border">
          {camera.track ? (
            <SelfPreview track={camera.track} />
          ) : (
            <p className="text-faint absolute inset-0 flex items-center justify-center px-6 text-center text-xs tracking-wider uppercase">
              {previewPlaceholder(camera.busy, camera.enabled, Boolean(camera.failure))}
            </p>
          )}
        </div>

        {/* Polite, not assertive: these resolve on their own a moment after the
            page opens, and an assertive region would interrupt whatever a screen
            reader was already saying. */}
        <div aria-live="polite" className="flex flex-col gap-3">
          {blockingFailure ? <MediaStateNotice failure={blockingFailure} /> : null}
          {!blockingFailure && cameraFailedWhileOn ? (
            <MediaStateNotice failure={cameraFailedWhileOn} compact />
          ) : null}
          {!blockingFailure && micFailedWhileOn ? (
            <MediaStateNotice failure={micFailedWhileOn} compact />
          ) : null}
        </div>

        {join.phase === 'failed' ? (
          <JoinFailureNotice
            code={join.code}
            message={join.message}
            onRetry={() => setJoin({ phase: 'lobby' })}
          />
        ) : null}

        <div className="mt-auto">
          <LobbyControls
            code={code}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            preview={preview}
            joining={join.phase === 'joining'}
            onJoin={() => void handleJoin()}
          />
        </div>
      </div>
    </main>
  );
}
