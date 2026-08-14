import { describe, expect, it } from 'vitest';

import { MEDIA_FAILURE_COPY } from '@/lib/media/media-failure-copy';

import { forbiddenCopyReason } from '../../../support/forbidden-copy';

const FAILURES = Object.keys(MEDIA_FAILURE_COPY) as (keyof typeof MEDIA_FAILURE_COPY)[];

describe('MEDIA_FAILURE_COPY', () => {
  // Three of these five — denied, no-device, in-use — are unreachable from the
  // e2e suite, because the fake-media flags auto-grant and always present a
  // device. A unit test is the only thing that can check them at all, which is
  // why the map was moved out of the component.
  it('covers every failure the classifier can produce', () => {
    expect(FAILURES).toHaveLength(5);
    expect(FAILURES).toEqual(
      expect.arrayContaining(['denied', 'no-device', 'in-use', 'timeout', 'error']),
    );
  });

  it('leaks no code, provider, or stack frame in any field', () => {
    for (const failure of FAILURES) {
      const copy = MEDIA_FAILURE_COPY[failure];

      for (const [field, text] of Object.entries(copy)) {
        const reason = forbiddenCopyReason(text);
        expect(reason, `${failure}.${field} contains ${reason}: ${text}`).toBeNull();
      }
    }
  });

  // The rule that separates this from a generic error message. Every entry has to
  // end somewhere the person can act, because a blocked camera with no recovery
  // steps is just a dead end with better grammar.
  it('always says what to do next', () => {
    for (const failure of FAILURES) {
      expect(MEDIA_FAILURE_COPY[failure].hint.length).toBeGreaterThan(20);
    }
  });
});
