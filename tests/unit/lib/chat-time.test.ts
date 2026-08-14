import { describe, expect, it } from 'vitest';

import { formatChatTime } from '@/lib/chat-time';

const NOW = 1_760_000_000_000;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `ago(n)` is a message that landed `n` milliseconds before NOW. */
const ago = (elapsed: number) => formatChatTime(NOW - elapsed, NOW);

describe('formatChatTime', () => {
  it('reads as the present for anything under a minute', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(59 * SECOND)).toBe('just now');
  });

  it('switches to minutes exactly on the minute', () => {
    expect(ago(MINUTE)).toBe('1m');
    expect(ago(90 * SECOND)).toBe('1m');
    expect(ago(59 * MINUTE)).toBe('59m');
  });

  it('switches to hours exactly on the hour', () => {
    expect(ago(HOUR)).toBe('1h');
    expect(ago(23 * HOUR)).toBe('23h');
  });

  it('switches to days exactly on the day', () => {
    expect(ago(DAY)).toBe('1d');
    expect(ago(9 * DAY)).toBe('9d');
  });

  it('truncates rather than rounding', () => {
    // 119 seconds is one minute and change, not two. Rounding up would show a
    // message as older than it is, which is the direction that misleads.
    expect(ago(119 * SECOND)).toBe('1m');
    expect(ago(HOUR - SECOND)).toBe('59m');
  });

  it('treats a clock that has gone backwards as the present', () => {
    // A message stamped in the future — a peer's clock, or our own having been
    // corrected mid-call. Never a negative age.
    expect(formatChatTime(NOW + HOUR, NOW)).toBe('just now');
  });
});
