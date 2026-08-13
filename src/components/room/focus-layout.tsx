'use client';

import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';

import { ParticipantTile } from '@/components/room/participant-tile';
import { cn } from '@/lib/utils';

interface FocusLayoutProps {
  focused: TrackReferenceOrPlaceholder;
  filmstrip: readonly TrackReferenceOrPlaceholder[];
  tileKey: (trackRef: TrackReferenceOrPlaceholder) => string;
  pinnedKey: string | null;
  onTogglePin: (key: string) => void;
  /** Forced horizontal while a panel holds the right column. */
  stripHorizontal?: boolean;
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
  stripHorizontal = false,
}: FocusLayoutProps) {
  const focusedKey = tileKey(focused);

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col gap-2',
        // Vertical strip only when the right column is free. With a panel open it
        // stays horizontal, so the two never stack into one narrow column.
        !stripHorizontal && 'lg:flex-row',
      )}
    >
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
          className={cn(
            'flex min-h-0 min-w-0 flex-none gap-2 overflow-x-auto overflow-y-hidden',
            !stripHorizontal && 'lg:w-48 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto',
          )}
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
