/**
 * What a participant tile calls the person in it.
 *
 * Pure, and separate from the tile for the same reason `room-focus.ts` is: the
 * tile itself cannot be reached without a live LiveKit room, and these are the
 * parts worth testing exhaustively. The component supplies the three facts and
 * renders the answer.
 */

/** Shown for a remote participant whose token carried no name. Never their identity,
 *  which is `guest:<uuid>` and is neither readable nor ours to display. */
const UNNAMED = 'Guest';
const LOCAL_LABEL = 'You';

export interface TileLabels {
  /** The person's own name, which is what the initials are drawn from. */
  displayName: string;
  /** What the label row reads. */
  label: string;
}

/**
 * The two names a tile needs, which are deliberately not the same string.
 *
 * `displayName` stays the person's actual name even for yourself, because the
 * initials behind a camera-off tile are a picture of the person and `YO` is not
 * one. `label` says `You` instead, because a row of tiles where one is captioned
 * with your own name reads as someone else in the call sharing it.
 *
 * The screen suffix hangs off the label only. A share tile draws no initials —
 * if its track reference exists the share is live — so there is nothing for a
 * `displayName` of `Ada — screen` to be used by, and it would produce `AS` on the
 * one frame before the track attaches.
 */
export function tileLabels(params: {
  name: string | undefined;
  isLocal: boolean;
  isScreenShare: boolean;
}): TileLabels {
  // Trimmed before the fallback, so a name of only spaces falls back rather than
  // rendering an empty caption and initials of ''.
  const displayName = params.name?.trim() || (params.isLocal ? LOCAL_LABEL : UNNAMED);
  const personLabel = params.isLocal ? LOCAL_LABEL : displayName;

  return {
    displayName,
    label: params.isScreenShare ? `${personLabel} — screen` : personLabel,
  };
}
