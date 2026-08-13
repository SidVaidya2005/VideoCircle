'use client';

import { MediaStateNotice } from '@/components/lobby/media-state-notice';
import { SelfPreview } from '@/components/lobby/self-preview';
import { useMediaPreview } from '@/hooks/use-media-preview';

interface RoomExperienceProps {
  code: string;
}

/**
 * Host for everything at `/room/[code]`.
 *
 * Today that is the lobby's self-preview and its device states. The lobby
 * controls and the connected call mount into this same component rather than
 * their own routes: navigating between lobby and call would unmount the tree and
 * tear down the local media tracks, which is the one thing that must survive the
 * transition.
 */
export function RoomExperience({ code }: RoomExperienceProps) {
  const preview = useMediaPreview();

  const video = preview.status === 'ready' ? preview.video : null;
  const blockingFailure =
    preview.status === 'denied' ||
    preview.status === 'no-device' ||
    preview.status === 'in-use' ||
    preview.status === 'timeout' ||
    preview.status === 'error'
      ? preview.status
      : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
            <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
            Lobby
          </p>
          {/* Verbatim and lowercase — a room code is an identifier, not prose. */}
          <code className="text-ink-2 text-xs">{code}</code>
        </div>

        <div className="border-line/60 bg-canvas animate-tile-in relative aspect-video w-full overflow-hidden rounded-lg border">
          {video ? (
            <SelfPreview track={video} />
          ) : (
            <p className="text-faint absolute inset-0 flex items-center justify-center px-6 text-center text-xs tracking-wider uppercase">
              {preview.status === 'requesting' ? 'Waiting for camera and microphone' : 'Camera off'}
            </p>
          )}
        </div>

        {/* Polite, not assertive: the state resolves on its own a moment after the
            page opens, and an assertive region would interrupt whatever a screen
            reader was already saying about the page. */}
        <div aria-live="polite" className="flex flex-col gap-3">
          {blockingFailure ? <MediaStateNotice failure={blockingFailure} /> : null}

          {preview.status === 'ready' && preview.cameraFailure ? (
            <MediaStateNotice failure={preview.cameraFailure} compact />
          ) : null}

          {preview.status === 'ready' && preview.micFailure ? (
            <MediaStateNotice failure={preview.micFailure} compact />
          ) : null}
        </div>
      </div>
    </main>
  );
}
