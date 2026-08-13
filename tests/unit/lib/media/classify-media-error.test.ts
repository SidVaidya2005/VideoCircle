import { describe, expect, it } from 'vitest';

import { classifyMediaError } from '@/lib/media/classify-media-error';

/**
 * The names below are what browsers actually throw from `getUserMedia`, including
 * the legacy spellings still emitted by older Android WebViews. Each one maps to a
 * different piece of recovery advice, so a wrong mapping is a user told to fix the
 * wrong thing.
 */
describe('classifyMediaError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['NotFoundError', 'no-device'],
    ['DevicesNotFoundError', 'no-device'],
    ['NotReadableError', 'in-use'],
    ['TrackStartError', 'in-use'],
  ])('maps %s to %s', (name, expected) => {
    expect(classifyMediaError(new DOMException('', name))).toBe(expected);
  });

  it('maps an unrecognised DOMException to the generic failure', () => {
    // Thrown when a deviceId constraint cannot be satisfied — reachable once the
    // lobby gains device pickers.
    expect(classifyMediaError(new DOMException('', 'OverconstrainedError'))).toBe('error');
  });

  it('maps a thrown value with no name to the generic failure', () => {
    // The SDK returns undefined rather than Other for these, so they take a
    // different path through the switch than an unrecognised DOMException does.
    expect(classifyMediaError({})).toBe('error');
    expect(classifyMediaError(null)).toBe('error');
    expect(classifyMediaError('camera exploded')).toBe('error');
  });
});
