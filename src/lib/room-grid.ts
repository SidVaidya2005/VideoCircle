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
