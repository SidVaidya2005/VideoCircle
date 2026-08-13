import { describe, expect, it } from 'vitest';

import { MAX_VISIBLE_TILES } from '@/lib/constants';
import { gridColumnsClass, orderCallTiles, splitVisibleTiles } from '@/lib/room-grid';

describe('gridColumnsClass', () => {
  it('gives a lone participant the whole grid', () => {
    expect(gridColumnsClass(1)).toBe('grid-cols-1');
  });

  it('never puts two tiles side by side on a phone', () => {
    // 360px split two ways is a 170px tile. Every band stays single-column until
    // sm:, which is the phone/tablet line.
    for (let count = 1; count <= MAX_VISIBLE_TILES; count += 1) {
      expect(gridColumnsClass(count)).toMatch(/^grid-cols-1\b/);
    }
  });

  it('pairs two to four participants two across', () => {
    expect(gridColumnsClass(2)).toBe('grid-cols-1 sm:grid-cols-2');
    expect(gridColumnsClass(4)).toBe('grid-cols-1 sm:grid-cols-2');
  });

  it('gives three its own row on a laptop', () => {
    // Three across fills the row exactly; a fourth column would leave a hole.
    expect(gridColumnsClass(3)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
  });

  it('holds at three columns from five to nine', () => {
    for (const count of [5, 6, 7, 8, 9]) {
      expect(gridColumnsClass(count)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    }
  });

  it('widens to four columns at ten and above', () => {
    for (const count of [10, 11, 12]) {
      expect(gridColumnsClass(count)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
    }
  });

  it('stays on the widest band past the cap', () => {
    // The grid never receives more than MAX_VISIBLE_TILES, but a caller that
    // miscounts must still get a real class rather than an empty string.
    expect(gridColumnsClass(13)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  });

  it('renders something for an empty grid', () => {
    // Unreachable in a connected room — the local participant is always present —
    // but a first render that returned no class would collapse the layout.
    expect(gridColumnsClass(0)).toBe('grid-cols-1');
  });

  it('emits only class names Tailwind can have compiled', () => {
    // Interpolating the column count is the failure this guards: the class would
    // read correctly in the DOM and match no generated rule.
    for (let count = 0; count <= 13; count += 1) {
      for (const name of gridColumnsClass(count).split(' ')) {
        expect(name).toMatch(/^(sm:|lg:)?grid-cols-[1-4]$/);
      }
    }
  });
});

describe('orderCallTiles', () => {
  it('puts shares first, then you, then everyone else', () => {
    expect(
      orderCallTiles({
        shares: ['share'],
        localCameras: ['me'],
        remoteCameras: ['them', 'other'],
      }),
    ).toEqual(['share', 'me', 'them', 'other']);
  });

  it('keeps the grid unchanged when nobody is sharing', () => {
    expect(orderCallTiles({ shares: [], localCameras: ['me'], remoteCameras: ['them'] })).toEqual([
      'me',
      'them',
    ]);
  });

  it('orders several shares ahead of every camera', () => {
    expect(
      orderCallTiles({
        shares: ['share-a', 'share-b'],
        localCameras: ['me'],
        remoteCameras: ['them'],
      }),
    ).toEqual(['share-a', 'share-b', 'me', 'them']);
  });

  it('survives the cap even in a full call', () => {
    // The reason shares lead at all: sorted naturally, a share in a busy call
    // lands past the cap and is invisible to everyone while the person sharing
    // believes it is up.
    const remotes = Array.from({ length: 20 }, (_, index) => `remote-${index}`);
    const ordered = orderCallTiles({
      shares: ['share'],
      localCameras: ['me'],
      remoteCameras: remotes,
    });

    expect(splitVisibleTiles(ordered).visible).toContain('share');
    expect(splitVisibleTiles(ordered).visible[0]).toBe('share');
  });
});

describe('splitVisibleTiles', () => {
  const tiles = (count: number) => Array.from({ length: count }, (_, index) => index);

  it('shows everyone when the room is under the cap', () => {
    expect(splitVisibleTiles(tiles(5))).toEqual({ visible: [0, 1, 2, 3, 4], hiddenCount: 0 });
  });

  it('hides nobody at exactly the cap', () => {
    const split = splitVisibleTiles(tiles(MAX_VISIBLE_TILES));
    expect(split.visible).toHaveLength(MAX_VISIBLE_TILES);
    expect(split.hiddenCount).toBe(0);
  });

  it('counts the overflow past the cap', () => {
    const split = splitVisibleTiles(tiles(MAX_VISIBLE_TILES + 3));
    expect(split.visible).toHaveLength(MAX_VISIBLE_TILES);
    expect(split.hiddenCount).toBe(3);
  });

  it('keeps the order it was given', () => {
    // Speakers are promoted upstream by useVisualStableUpdate. Re-sorting here
    // would undo that and drop whoever is talking off the visible page.
    expect(splitVisibleTiles(['a', 'b', 'c']).visible).toEqual(['a', 'b', 'c']);
  });

  it('handles an empty room without a negative count', () => {
    expect(splitVisibleTiles([])).toEqual({ visible: [], hiddenCount: 0 });
  });
});
