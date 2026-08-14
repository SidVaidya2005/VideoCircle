import { describe, expect, it } from 'vitest';

import { eventTimestampIso, userIdFromIdentity } from '@/lib/livekit/participation-event';

const USER_ID = '3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607';
const FALLBACK = new Date('2026-08-14T12:00:00.000Z');

describe('userIdFromIdentity', () => {
  it('reads the profile id out of a signed-in identity', () => {
    expect(userIdFromIdentity(`user:${USER_ID}`)).toBe(USER_ID);
  });

  it('accepts an uppercase uuid, which Postgres stores the same either way', () => {
    expect(userIdFromIdentity(`user:${USER_ID.toUpperCase()}`)).toBe(USER_ID.toUpperCase());
  });

  it('returns null for a guest identity', () => {
    expect(userIdFromIdentity(`guest:${USER_ID}`)).toBeNull();
  });

  it('returns null when the user prefix wraps something that is not a uuid', () => {
    // Impossible from /api/token, so it means one of our own bugs — but it must
    // not throw, or LiveKit redelivers a 500 that can never parse any better.
    expect(userIdFromIdentity('user:not-a-uuid')).toBeNull();
    expect(userIdFromIdentity('user:')).toBeNull();
  });

  it('returns null for an identity carrying no prefix at all', () => {
    expect(userIdFromIdentity(USER_ID)).toBeNull();
    expect(userIdFromIdentity('')).toBeNull();
  });

  it('does not match a prefix that merely contains "user:"', () => {
    expect(userIdFromIdentity(`guest:user:${USER_ID}`)).toBeNull();
  });
});

describe('eventTimestampIso', () => {
  it('converts livekit seconds to an ISO string', () => {
    expect(eventTimestampIso(1_776_168_000n, FALLBACK)).toBe('2026-04-14T12:00:00.000Z');
  });

  it('falls back when the field is absent', () => {
    // proto3 defaults an unset int64 to 0, which is a real date fifty-six years wrong.
    expect(eventTimestampIso(0n, FALLBACK)).toBe(FALLBACK.toISOString());
  });

  it('falls back on a negative timestamp rather than writing a pre-epoch date', () => {
    expect(eventTimestampIso(-1n, FALLBACK)).toBe(FALLBACK.toISOString());
  });
});
