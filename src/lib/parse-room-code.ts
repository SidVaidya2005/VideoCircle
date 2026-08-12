import { ROOM_CODE_PATTERN } from '@/lib/room-code';

export interface ParsedRoomCodeInput {
  code: string;
  /**
   * The fragment exactly as it was typed, leading `#` included, or `''` when there
   * was none. Opaque here: never parsed, decoded, or validated — F17 owns reading
   * the chat key out of it.
   */
  fragment: string;
}

/**
 * Turns whatever someone pasted into a room code and its fragment, or `null`.
 *
 * Accepts a bare `abc-defg-hjk` or a whole share link from any origin, because the
 * link in someone's hand may come from the deployed site while they are on
 * localhost, may carry tracking parameters, or may have been through a redirector.
 * Permissive about everything except the code itself, which must match
 * `ROOM_CODE_PATTERN` exactly.
 */
export function parseRoomCodeInput(raw: string): ParsedRoomCodeInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Split the fragment off FIRST, and never touch it again. The chat key is
  // base64url, which is case-sensitive — lowercasing the whole string to normalise
  // the code would silently corrupt the key and cost the user chat with no error.
  const hashIndex = trimmed.indexOf('#');
  const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;

  // Lowercase only the part that can hold the code. The alphabet is lowercase-only,
  // and a code an email client capitalised is not a malformed code.
  const path = (beforeHash.split('?')[0] ?? '').toLowerCase();

  // Scan every segment rather than assuming a trailing `/room/<code>`: that survives
  // a trailing slash, a locale prefix, and a redirector that reshaped the path.
  const code = path.split('/').find((segment) => ROOM_CODE_PATTERN.test(segment));

  return code ? { code, fragment } : null;
}
