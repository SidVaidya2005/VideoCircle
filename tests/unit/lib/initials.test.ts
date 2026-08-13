import { describe, expect, it } from 'vitest';

import { toInitials } from '@/lib/initials';

describe('toInitials', () => {
  it('takes the first and last word of a full name', () => {
    expect(toInitials('Siddarth Vaidya')).toBe('SV');
  });

  it('skips the middle of a longer name', () => {
    expect(toInitials('Ana Maria Duarte')).toBe('AD');
  });

  it('gives a mononym a single letter', () => {
    // "PR" would read as an abbreviation of the word rather than as a person.
    expect(toInitials('Priya')).toBe('P');
  });

  it('uppercases whatever it is given', () => {
    expect(toInitials('tom okafor')).toBe('TO');
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(toInitials('  Tom   Okafor  ')).toBe('TO');
  });

  it('falls back rather than rendering an empty tile', () => {
    expect(toInitials('')).toBe('?');
    expect(toInitials('   ')).toBe('?');
  });

  it('does not split an astral character in half', () => {
    // Sliced by index this yields a lone surrogate, which renders as a tofu box.
    // Display names are typed by whoever joins, so this is input, not an edge case.
    expect(toInitials('𝒜lice 𝒵hang')).toBe('𝒜𝒵');
  });

  it('keeps a two-character result at two characters', () => {
    for (const name of ['A B', 'Alexandra Beaumont-Whitfield', 'x y z']) {
      expect(Array.from(toInitials(name))).toHaveLength(2);
    }
  });
});
