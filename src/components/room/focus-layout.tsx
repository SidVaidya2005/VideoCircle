'use client';

import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';

import { ParticipantTile } from '@/components/room/participant-tile';

interface FocusLayoutProps {
  focused: TrackReferenceOrPlaceholder;
  filmstrip: readonly TrackReferenceOrPlaceholder[];
  tileKey: (trackRef: TrackReferenceOrPlaceholder) => string;
  pinnedKey: string | null;
  onTogglePin: (key: string) => void;
}

/**
 * One large tile with everyone else beside it.
 *
 * The strip runs horizontally under the focus on a phone and vertically to its
 * right from `lg:` up — the kit's own layout rule, and the only arrangement that
 * leaves a 16:9 focus usable at 360px. Each strip tile keeps its aspect ratio and
 * the strip scrolls in its own container, so the page never scrolls sideways.
 */
export function FocusLayout({
  focused,
  filmstrip,
  tileKey,
  pinnedKey,
  onTogglePin,
}: FocusLayoutProps) {
  const focusedKey = tileKey(focused);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
      {/* min-h-0 and min-w-0 on both children: without them a flex child refuses
          to shrink below its content and the strip pushes the focus off screen. */}
      {/* Two lists, each named: without the labels a screen reader announces
          "list" twice with no way to tell the focused participant from the rest. */}
      <ul aria-label="Focused participant" className="flex min-h-0 min-w-0 flex-1 list-none">
        <ParticipantTile
          key={focusedKey}
          trackRef={focused}
          size="focus"
          pinned={pinnedKey === focusedKey}
          onTogglePin={() => onTogglePin(focusedKey)}
        />
      </ul>

      {filmstrip.length > 0 ? (
        <ul
          aria-label="Other participants"
          className="flex min-h-0 min-w-0 flex-none gap-2 overflow-x-auto overflow-y-hidden lg:w-48 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
        >
          {filmstrip.map((trackRef) => {
            const key = tileKey(trackRef);
            return (
              <ParticipantTile
                key={key}
                trackRef={trackRef}
                size="strip"
                pinned={pinnedKey === key}
                onTogglePin={() => onTogglePin(key)}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
