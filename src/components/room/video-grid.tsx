'use client';

import {
  useTracks,
  useVisualStableUpdate,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState } from 'react';

import { FocusLayout } from '@/components/room/focus-layout';
import { ParticipantTile } from '@/components/room/participant-tile';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MAX_VISIBLE_TILES } from '@/lib/constants';
import { resolveFocusKey, splitFocus } from '@/lib/room-focus';
import { gridColumnsClass, orderCallTiles, splitVisibleTiles } from '@/lib/room-grid';
import { cn } from '@/lib/utils';

/**
 * Identity plus source, stable across the placeholder-to-published transition so a
 * tile is not torn down when a camera comes on — and the shape a pin is stored
 * as, since a key cannot keep a departed participant alive the way an object can.
 */
function tileKey(trackRef: TrackReferenceOrPlaceholder): string {
  return `${trackRef.participant.identity}:${trackRef.source}`;
}

interface VideoGridProps {
  /** While a panel holds the right column, the filmstrip stays horizontal. */
  sidePanelOpen?: boolean;
}

export function VideoGrid({ sidePanelOpen = false }: VideoGridProps) {
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  function togglePin(key: string) {
    setPinnedKey((current) => (current === key ? null : key));
  }

  // withPlaceholder on the camera keeps a tile for anyone whose camera is off.
  // Without it, muting your camera deletes you from everyone's grid instead of
  // showing your name — the difference between "camera off" and "left the call".
  //
  // A screen share never gets a placeholder: unlike a camera it has no off state
  // to represent. If the reference exists, the share is live.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const shares = tracks.filter((track) => track.source === Track.Source.ScreenShare);
  const cameras = tracks.filter((track) => track.source === Track.Source.Camera);
  const localCameras = cameras.filter((track) => track.participant.isLocal);
  const remoteCameras = cameras.filter((track) => !track.participant.isLocal);

  // Promotes whoever is speaking onto the visible page and holds everyone else
  // still, so tiles do not shuffle under the cursor every time someone mutes.
  // Applied to remote cameras only: shares and you are placed ahead of them and
  // can never be what the cap hides. The budget shrinks by whatever they take.
  const remoteBudget = Math.max(1, MAX_VISIBLE_TILES - shares.length - localCameras.length);
  const stableRemotes = useVisualStableUpdate(remoteCameras, remoteBudget);

  const { visible, hiddenCount } = splitVisibleTiles(
    orderCallTiles({ shares, localCameras, remoteCameras: stableRemotes }),
  );

  // Grid is the resting state. Spotlight is entered only by a pin or a share —
  // never by speech, which would flip the layout several times a minute in an
  // ordinary conversation. Active speakers order the strip and ring their tile.
  const keyed = visible.map((trackRef) => ({
    key: tileKey(trackRef),
    isScreenShare: trackRef.source === Track.Source.ScreenShare,
    trackRef,
  }));
  const { focused, filmstrip } = splitFocus(keyed, resolveFocusKey({ pinnedKey, tiles: keyed }));

  return (
    <TooltipProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {focused ? (
          <FocusLayout
            focused={focused.trackRef}
            filmstrip={filmstrip.map((tile) => tile.trackRef)}
            tileKey={tileKey}
            pinnedKey={pinnedKey}
            onTogglePin={togglePin}
            stripHorizontal={sidePanelOpen}
          />
        ) : (
          <ul
            aria-label="Participants"
            className={cn(
              // Tiles keep their 16:9 rather than stretching to fill the window, so
              // there is usually height left over — content-center splits it above
              // and below instead of pinning the call to the top of the screen. Once
              // the tiles outgrow the region it scrolls, and centring has no effect.
              'grid min-h-0 flex-1 content-center gap-2 overflow-y-auto',
              gridColumnsClass(visible.length),
            )}
          >
            {visible.map((trackRef) => {
              const key = tileKey(trackRef);
              return (
                <ParticipantTile
                  key={key}
                  trackRef={trackRef}
                  pinned={pinnedKey === key}
                  onTogglePin={() => togglePin(key)}
                />
              );
            })}
          </ul>
        )}

        {hiddenCount > 0 ? (
          // Said out loud rather than hidden silently: a participant invisible to
          // everyone else gets reported as a bug. They are still heard — audio does
          // not depend on holding a tile.
          //
          // Bare overline type, not <SectionOverline>: that component leads with the
          // red square, and inside a call red belongs to Leave and your own muted
          // mic alone.
          <p className="text-muted flex-none text-xs tracking-wider uppercase">
            {`+${hiddenCount} more`}
          </p>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
