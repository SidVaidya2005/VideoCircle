import { describe, expect, it } from 'vitest';

import { tileLabels } from '@/lib/room-tile';

/**
 * The tile's two names, which are deliberately different strings.
 *
 * Every case below fixes a caption a person actually reads off someone's video,
 * and the divergence between `displayName` and `label` is the part worth pinning:
 * collapsing them to one string passes a "renders a name" check and still puts
 * the wrong word on the tile.
 */
describe('tileLabels', () => {
  it('captions a remote participant with their own name', () => {
    expect(tileLabels({ name: 'Ada', isLocal: false, isScreenShare: false })).toEqual({
      displayName: 'Ada',
      label: 'Ada',
    });
  });

  it('captions you as You while keeping your name for the initials', () => {
    // The divergence. Initials are a picture of the person, and `YO` is not one.
    expect(tileLabels({ name: 'Ada', isLocal: true, isScreenShare: false })).toEqual({
      displayName: 'Ada',
      label: 'You',
    });
  });

  it('falls back to Guest for a remote participant with no name', () => {
    expect(tileLabels({ name: undefined, isLocal: false, isScreenShare: false })).toEqual({
      displayName: 'Guest',
      label: 'Guest',
    });
  });

  it('treats a name of only whitespace as no name', () => {
    // Untrimmed, this renders an empty caption and initials of ''.
    expect(tileLabels({ name: '   ', isLocal: false, isScreenShare: false })).toEqual({
      displayName: 'Guest',
      label: 'Guest',
    });
  });

  it('trims a padded name rather than falling back', () => {
    expect(tileLabels({ name: '  Ada  ', isLocal: false, isScreenShare: false })).toEqual({
      displayName: 'Ada',
      label: 'Ada',
    });
  });

  it('falls back to You for your own unnamed tile, never Guest', () => {
    expect(tileLabels({ name: undefined, isLocal: true, isScreenShare: false })).toEqual({
      displayName: 'You',
      label: 'You',
    });
  });

  it('suffixes a share, and only on the label', () => {
    // `displayName` stays clean: a share draws no initials, and `AS` is what
    // suffixing both would produce on the frame before the track attaches.
    expect(tileLabels({ name: 'Ada', isLocal: false, isScreenShare: true })).toEqual({
      displayName: 'Ada',
      label: 'Ada — screen',
    });
  });

  it('captions your own share as yours', () => {
    expect(tileLabels({ name: 'Ada', isLocal: true, isScreenShare: true })).toEqual({
      displayName: 'Ada',
      label: 'You — screen',
    });
  });

  it('never captions anyone with a raw identity', () => {
    // The fallback exists so `guest:<uuid>` cannot reach a caption. Nothing here
    // passes an identity in — this pins that nothing ever needs to.
    const { displayName, label } = tileLabels({
      name: undefined,
      isLocal: false,
      isScreenShare: true,
    });

    expect(displayName).not.toMatch(/guest:|user:/);
    expect(label).toBe('Guest — screen');
  });
});
