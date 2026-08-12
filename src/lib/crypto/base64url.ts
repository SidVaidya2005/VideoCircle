/**
 * base64url, per RFC 4648 §5 — base64 with `+/` swapped for `-_` and the `=`
 * padding dropped.
 *
 * Plain base64 is not safe in a URL fragment: `+` and `/` are legal there but are
 * routinely re-encoded or mangled by anything that re-serialises a link, and `=`
 * is a delimiter in the `k=…` parameter itself. The chat key travels in exactly
 * that fragment, so it is encoded this way and nowhere else.
 */

/** Encodes bytes as base64url. Output matches `/^[A-Za-z0-9_-]*$/`. */
export function toBase64Url(bytes: Uint8Array): string {
  // String.fromCharCode over the whole array blows the argument limit on large
  // inputs; a key is 32 bytes, but the helper should not be a trap for a caller
  // who reaches for it with something bigger.
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes base64url back to bytes. Throws on input that is not valid base64url.
 *
 * The return type is pinned to `Uint8Array<ArrayBuffer>` rather than a bare
 * `Uint8Array`, which now defaults to `Uint8Array<ArrayBufferLike>` and so could be
 * backed by a `SharedArrayBuffer`. Web Crypto's `BufferSource` excludes that, and
 * every caller here feeds the result straight into `crypto.subtle`.
 */
export function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // atob tolerates missing padding in some engines and not others, so restore it.
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
