import { describe, expect, it } from 'vitest';

import { sortParticipants, type SortableParticipant } from '@/lib/participants';

const person = (
  identity: string,
  joinedAt: number | undefined,
  isLocal = false,
): SortableParticipant => ({ identity, joinedAt, isLocal });

describe('sortParticipants', () => {
  it('puts you first however late you arrived', () => {
    const sorted = sortParticipants([
      person('grace', 100),
      person('ada', 300, true),
      person('alan', 200),
    ]);

    expect(sorted.map((p) => p.identity)).toEqual(['ada', 'grace', 'alan']);
  });

  it('orders everyone else by when they joined', () => {
    const sorted = sortParticipants([person('c', 300), person('a', 100), person('b', 200)]);
    expect(sorted.map((p) => p.identity)).toEqual(['a', 'b', 'c']);
  });

  it('breaks a tie on identity so rows cannot swap on a re-render', () => {
    // Two people stamped the same millisecond is not hypothetical in a room
    // everyone opens from the same link at once.
    const sorted = sortParticipants([person('zoe', 100), person('adam', 100)]);
    expect(sorted.map((p) => p.identity)).toEqual(['adam', 'zoe']);
  });

  it('sorts an unstamped participant last', () => {
    // No timestamp means LiveKit has only just seen them, which is the back of
    // the queue rather than the front.
    const sorted = sortParticipants([person('new', undefined), person('old', 100)]);
    expect(sorted.map((p) => p.identity)).toEqual(['old', 'new']);
  });

  it('does not mutate what it was given', () => {
    // The input is LiveKit's own array; sorting it in place would reorder state
    // the SDK owns.
    const input = [person('b', 200), person('a', 100)];
    sortParticipants(input);
    expect(input.map((p) => p.identity)).toEqual(['b', 'a']);
  });

  it('handles a call of one', () => {
    expect(sortParticipants([person('me', 100, true)]).map((p) => p.identity)).toEqual(['me']);
  });

  it('handles an empty list', () => {
    expect(sortParticipants([])).toEqual([]);
  });
});
