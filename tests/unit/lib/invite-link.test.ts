import { describe, expect, it } from 'vitest';

import { buildInviteLink } from '@/lib/invite-link';

const SITE = 'https://videocircle.example';
const CODE = 'abc-defg-hjk';

describe('buildInviteLink', () => {
  it('joins the configured origin, the code, and the fragment', () => {
    expect(buildInviteLink(SITE, CODE, '#k=abc123')).toBe(
      'https://videocircle.example/room/abc-defg-hjk#k=abc123',
    );
  });

  it('carries a mixed-case key through untouched', () => {
    // The rule this function exists to keep. base64url is case-sensitive, so a
    // link that lowercased its fragment would still join the call and silently
    // decode chat to the wrong bytes — the call works, only chat is unreadable.
    const key = '#k=aB3-_xYZ09';
    expect(buildInviteLink(SITE, CODE, key)).toContain(key);
    expect(buildInviteLink(SITE, CODE, key)).not.toContain(key.toLowerCase());
  });

  it('produces a keyless link when there is no fragment', () => {
    expect(buildInviteLink(SITE, CODE, '')).toBe('https://videocircle.example/room/abc-defg-hjk');
  });

  it('never reaches for the current origin', () => {
    // The point of taking the site URL as an argument: someone on a preview
    // deployment or an IP address must still hand out the canonical host.
    const link = buildInviteLink(SITE, CODE, '#k=abc123');
    expect(link).not.toContain('localhost');
    expect(link.startsWith(SITE)).toBe(true);
  });

  it('does not double the slash when the site URL has a trailing one', () => {
    expect(buildInviteLink(`${SITE}/`, CODE, '')).toBe(
      'https://videocircle.example/room/abc-defg-hjk',
    );
  });

  it('leaves any other fragment alone', () => {
    // Nothing here knows what a fragment means; it is the caller's business and
    // this function's job is only to not damage it.
    expect(buildInviteLink(SITE, CODE, '#something=else')).toContain('#something=else');
  });
});
