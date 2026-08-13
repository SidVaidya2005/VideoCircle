import { MAX_VISIBLE_TILES } from '@/lib/constants';

/**
 * Column classes by headcount, mobile-first.
 *
 * Whole class strings, never interpolated from a number: Tailwind scans source
 * text for literal class names, so `grid-cols-${n}` compiles to a class that was
 * never emitted and the grid silently collapses to one column.
 *
 * Only `sm:` and `lg:` appear. A phone always stacks — two 16:9 tiles side by
 * side at 360px are 170px wide, which is a thumbnail, not a face.
 */
const COLUMNS_BY_COUNT = {
  /** Alone in the call: one tile, as large as the space allows. */
  solo: 'grid-cols-1',
  /** Two to four. 2×2 beats 4×1 at every width — a single row of four goes thin. */
  small: 'grid-cols-1 sm:grid-cols-2',
  /** Three, and five to nine. Three across on a laptop keeps rows shallow. */
  medium: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  /** Ten and up. Four across is what keeps twelve tiles on one screen. */
  large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * The grid's column classes for a given number of visible tiles.
 *
 * Pure and keyed to headcount rather than to a measured container: measuring
 * would mean a `ResizeObserver` and a render pass on every resize, inside the one
 * tree that shares a main thread with WebRTC encoding.
 */
export function gridColumnsClass(tileCount: number): string {
  if (tileCount <= 1) return COLUMNS_BY_COUNT.solo;
  // Three sits with the medium band, not with two and four: at three, a third
  // column fills the row exactly, where a fourth would leave a hole.
  if (tileCount === 3) return COLUMNS_BY_COUNT.medium;
  if (tileCount <= 4) return COLUMNS_BY_COUNT.small;
  if (tileCount <= 9) return COLUMNS_BY_COUNT.medium;
  return COLUMNS_BY_COUNT.large;
}

/**
 * Grid order: every screen share first, then you, then everyone else.
 *
 * Shares lead because the cap is applied after this — a share sorted into its
 * natural position can land past `MAX_VISIBLE_TILES` in a busy call and be
 * invisible to everyone while the person sharing believes it is up. This is a
 * sort, not a layout: the focused view, the filmstrip and manual pinning are
 * feature 13's, and none of them has to unpick this.
 *
 * You come second so the cap can never hide you from yourself, which is why the
 * caller stable-sorts only the remote cameras.
 */
export function orderCallTiles<T>(groups: {
  shares: readonly T[];
  localCameras: readonly T[];
  remoteCameras: readonly T[];
}): T[] {
  return [...groups.shares, ...groups.localCameras, ...groups.remoteCameras];
}

export interface TileSplit<T> {
  /** The tiles that get rendered, capped at `MAX_VISIBLE_TILES`. */
  visible: T[];
  /** How many participants are present but hold no tile. Zero at or under the cap. */
  hiddenCount: number;
}

/**
 * Splits ordered tiles into the ones that render and a count of the rest.
 *
 * Generic over the element type so it stays free of LiveKit imports and testable
 * without a room. The caller orders first — active speakers are promoted onto the
 * visible page upstream, so the cap never hides whoever is talking.
 *
 * Hidden participants are still heard: `RoomAudioRenderer` plays every remote
 * audio track regardless of whether that participant holds a tile.
 */
export function splitVisibleTiles<T>(tiles: readonly T[]): TileSplit<T> {
  return {
    visible: tiles.slice(0, MAX_VISIBLE_TILES),
    hiddenCount: Math.max(0, tiles.length - MAX_VISIBLE_TILES),
  };
}
