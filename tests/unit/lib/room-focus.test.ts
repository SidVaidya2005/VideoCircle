import { describe, expect, it } from 'vitest';

import { resolveFocusKey, splitFocus, type FocusableTile } from '@/lib/room-focus';

const tile = (key: string, isScreenShare = false): FocusableTile => ({ key, isScreenShare });

const ADA_SCREEN = tile('ada:screen_share', true);
const ADA_CAM = tile('ada:camera');
const GRACE_CAM = tile('grace:camera');

describe('resolveFocusKey', () => {
  it('shows the grid when nothing is pinned and nobody is sharing', () => {
    expect(resolveFocusKey({ pinnedKey: null, tiles: [ADA_CAM, GRACE_CAM] })).toBeNull();
  });

  it('focuses a screen share on its own', () => {
    expect(resolveFocusKey({ pinnedKey: null, tiles: [ADA_SCREEN, ADA_CAM] })).toBe(
      'ada:screen_share',
    );
  });

  it('lets a pin outrank a running share', () => {
    expect(
      resolveFocusKey({ pinnedKey: 'grace:camera', tiles: [ADA_SCREEN, ADA_CAM, GRACE_CAM] }),
    ).toBe('grace:camera');
  });

  it('falls back to the share when the pinned tile has gone', () => {
    // Someone pins a participant, that participant leaves, and a share is running.
    expect(resolveFocusKey({ pinnedKey: 'gone:camera', tiles: [ADA_SCREEN, ADA_CAM] })).toBe(
      'ada:screen_share',
    );
  });

  it('returns to the grid when the pinned tile has gone and nothing is shared', () => {
    // The alternative — holding spotlight on whoever speaks next — leaves a
    // focused layout with nothing pinned and no obvious way out.
    expect(resolveFocusKey({ pinnedKey: 'gone:camera', tiles: [ADA_CAM, GRACE_CAM] })).toBeNull();
  });

  it('takes the first share when two people present at once', () => {
    const second = tile('grace:screen_share', true);
    expect(resolveFocusKey({ pinnedKey: null, tiles: [ADA_SCREEN, second, ADA_CAM] })).toBe(
      'ada:screen_share',
    );
  });

  it('can pin a share itself', () => {
    expect(resolveFocusKey({ pinnedKey: 'ada:screen_share', tiles: [ADA_SCREEN, ADA_CAM] })).toBe(
      'ada:screen_share',
    );
  });

  it('shows the grid in an empty call', () => {
    expect(resolveFocusKey({ pinnedKey: 'anything', tiles: [] })).toBeNull();
  });
});

describe('splitFocus', () => {
  it('returns no focus and an empty strip for the grid', () => {
    expect(splitFocus([ADA_CAM, GRACE_CAM], null)).toEqual({ focused: null, filmstrip: [] });
  });

  it('keeps the sharer’s own camera in the strip', () => {
    // The point of removing only the focused *tile*: you keep Ada's face at
    // exactly the moment she is presenting and talking.
    const split = splitFocus([ADA_SCREEN, ADA_CAM, GRACE_CAM], 'ada:screen_share');

    expect(split.focused).toBe(ADA_SCREEN);
    expect(split.filmstrip).toEqual([ADA_CAM, GRACE_CAM]);
  });

  it('preserves the order it was given', () => {
    // Ordering is decided upstream by orderCallTiles and useVisualStableUpdate;
    // re-sorting here would undo both.
    const split = splitFocus([ADA_SCREEN, ADA_CAM, GRACE_CAM], 'ada:camera');
    expect(split.filmstrip).toEqual([ADA_SCREEN, GRACE_CAM]);
  });

  it('falls back to the grid when the focused key names no tile', () => {
    expect(splitFocus([ADA_CAM], 'gone:camera')).toEqual({ focused: null, filmstrip: [] });
  });

  it('gives an empty strip when the focused tile is the only one', () => {
    expect(splitFocus([ADA_CAM], 'ada:camera')).toEqual({ focused: ADA_CAM, filmstrip: [] });
  });
});
