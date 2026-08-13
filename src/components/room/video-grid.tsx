'use client';

import { useTracks, useVisualStableUpdate } from '@livekit/components-react';
import { Track } from 'livekit-client';

import { ParticipantTile } from '@/components/room/participant-tile';
import { MAX_VISIBLE_TILES } from '@/lib/constants';
import { gridColumnsClass, splitVisibleTiles } from '@/lib/room-grid';
import { cn } from '@/lib/utils';

/** Local always holds the first tile, so the rest compete for what is left. */
const MAX_REMOTE_TILES = MAX_VISIBLE_TILES - 1;

export function VideoGrid() {
  // withPlaceholder keeps a tile for anyone whose camera is off. Without it,
  // muting your camera deletes you from everyone's grid instead of showing your
  // name — the difference between "camera off" and "left the call".
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  const local = tracks.filter((track) => track.participant.isLocal);
  const remotes = tracks.filter((track) => !track.participant.isLocal);

  // Promotes whoever is speaking onto the visible page and holds everyone else
  // still, so tiles do not shuffle under the cursor every time someone mutes.
  // Applied to remotes only: you are pinned first and can never be the one the
  // cap hides.
  const stableRemotes = useVisualStableUpdate(remotes, MAX_REMOTE_TILES);

  const { visible, hiddenCount } = splitVisibleTiles([...local, ...stableRemotes]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ul
        className={cn(
          // Tiles keep their 16:9 rather than stretching to fill the window, so
          // there is usually height left over — content-center splits it above
          // and below instead of pinning the call to the top of the screen. Once
          // the tiles outgrow the region it scrolls, and centring has no effect.
          'grid min-h-0 flex-1 content-center gap-2 overflow-y-auto',
          gridColumnsClass(visible.length),
        )}
      >
        {visible.map((trackRef) => (
          <ParticipantTile
            // Identity plus source is stable across the placeholder-to-published
            // transition, so a tile is not torn down when its camera comes on.
            key={`${trackRef.participant.identity}:${trackRef.source}`}
            trackRef={trackRef}
          />
        ))}
      </ul>

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
  );
}
