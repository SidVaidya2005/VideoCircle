import { ConnectionQuality } from 'livekit-client';
import { describe, expect, it } from 'vitest';

import { connectionQualityLabel } from '@/lib/livekit/connection-quality';

describe('connectionQualityLabel', () => {
  it('marks only the two degraded states', () => {
    expect(connectionQualityLabel(ConnectionQuality.Poor)).toBe('weak');
    expect(connectionQualityLabel(ConnectionQuality.Lost)).toBe('connection lost');
  });

  it('says nothing when the connection is fine', () => {
    expect(connectionQualityLabel(ConnectionQuality.Excellent)).toBeNull();
    expect(connectionQualityLabel(ConnectionQuality.Good)).toBeNull();
  });

  // The value every participant holds before their first quality report arrives.
  // Treating it as degraded would mark every tile the instant it mounts and then
  // clear a second later, on every join, for everyone.
  it('says nothing while quality is still unknown', () => {
    expect(connectionQualityLabel(ConnectionQuality.Unknown)).toBeNull();
  });

  // Guards the guard: if the SDK gains a sixth quality this loop still passes, but
  // the exhaustive switch in the module stops compiling — which is the intended
  // place to find out.
  it('answers for every quality the SDK defines', () => {
    const all = Object.values(ConnectionQuality);
    expect(all).toHaveLength(5); // Excellent, Good, Poor, Lost, Unknown

    for (const quality of all) {
      expect(() => connectionQualityLabel(quality)).not.toThrow();
    }
  });
});
