'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { JoinFailureNotice } from '@/components/lobby/join-failure-notice';
import { LobbyControls } from '@/components/lobby/lobby-controls';
import { MediaStateNotice } from '@/components/lobby/media-state-notice';
import { SelfPreview } from '@/components/lobby/self-preview';
import { ConnectedPanel } from '@/components/room/connected-panel';
import { RoomShell } from '@/components/room/room-shell';
import { SectionOverline } from '@/components/ui/section-overline';
import { useMediaPreview } from '@/hooks/use-media-preview';
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
  | { phase: 'failed'; code: string; message: string };

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
      <main className="flex min-h-dvh flex-col justify-center px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <RoomShell
            serverUrl={join.grant.serverUrl}
            token={join.grant.token}
            audio={microphone.enabled}
            video={camera.enabled}
            cameraId={camera.deviceId}
            microphoneId={microphone.deviceId}
            // Leaving returns Home, which is what project-overview.md describes.
            onDisconnected={() => router.push('/')}
          >
            <ConnectedPanel />
          </RoomShell>
        </div>
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
