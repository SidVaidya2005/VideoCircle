/** Shown when a name is empty or has no letters to take. Never a generated avatar. */
const FALLBACK = '?';

/**
 * Up to two uppercase characters standing in for a camera-off participant.
 *
 * First and last word for a full name, a single character for a mononym — two
 * letters off one word reads as an abbreviation of the word rather than as a
 * person ("PR" for Priya).
 *
 * Split by code point, not by index: a name starting with an astral character
 * would otherwise be cut mid-surrogate and render as a replacement glyph. Display
 * names are typed by whoever is joining, so this is ordinary input, not an edge
 * case.
 */
export function toInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return FALLBACK;

  const first = firstCharacter(words[0]);
  // words.length >= 1 is established above, so the last index is always occupied.
  const last = words.length > 1 ? firstCharacter(words[words.length - 1]) : '';

  return (first + last).toUpperCase() || FALLBACK;
}

function firstCharacter(word: string | undefined): string {
  return Array.from(word ?? '')[0] ?? '';
}
