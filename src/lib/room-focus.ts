/**
 * A tile, reduced to what focus resolution needs.
 *
 * Structural rather than a LiveKit type, so the decision is testable under Node —
 * the unit suite has no DOM and no room.
 */
export interface FocusableTile {
  /** `identity:source`, the same key the grid renders with. */
  key: string;
  isScreenShare: boolean;
}

/**
 * Which tile the spotlight shows, or `null` for the grid.
 *
 * Order is pin, then screen share, then nothing. **Active speakers are absent
 * from this signature on purpose:** the layout must not follow whoever is
 * talking, which in a four-way conversation would flip it several times a minute.
 * Speech orders the filmstrip and rings the speaking tile; it never moves focus.
 *
 * A pin whose tile has gone resolves to the share if one is running, and
 * otherwise to the grid. The alternative — holding spotlight open on some other
 * participant — leaves a focused layout with nothing pinned and no way out.
 */
export function resolveFocusKey(input: {
  pinnedKey: string | null;
  tiles: readonly FocusableTile[];
}): string | null {
  const pinned = input.tiles.find((tile) => tile.key === input.pinnedKey);
  if (pinned) return pinned.key;

  // First share, not "the" share: two people can present at once, and the
  // ordering upstream has already decided which one leads.
  const share = input.tiles.find((tile) => tile.isScreenShare);
  return share ? share.key : null;
}

export interface FocusSplit<T> {
  /** The large tile, or `null` when the layout is a grid. */
  focused: T | null;
  /** Everything else, in the order it was given. Empty when alone in a call. */
  filmstrip: T[];
}

/**
 * Splits ordered tiles into the focused one and the strip beside it.
 *
 * Only the focused *tile* is removed from the strip, never the focused
 * participant's other tiles: with someone's screen focused, their camera stays in
 * the strip, which is how you keep their face at the moment they are presenting.
 */
export function splitFocus<T extends FocusableTile>(
  tiles: readonly T[],
  focusedKey: string | null,
): FocusSplit<T> {
  if (focusedKey === null) return { focused: null, filmstrip: [] };

  const focused = tiles.find((tile) => tile.key === focusedKey) ?? null;
  if (!focused) return { focused: null, filmstrip: [] };

  return {
    focused,
    filmstrip: tiles.filter((tile) => tile.key !== focusedKey),
  };
}
