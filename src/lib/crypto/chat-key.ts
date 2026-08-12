import { fromBase64Url, toBase64Url } from '@/lib/crypto/base64url';

const KEY_PARAM = 'k';

/**
 * The meeting's chat key: AES-GCM 256, generated in the browser and carried in the
 * share link's fragment.
 *
 * Anyone holding the link holds the key. That is the stated model — it protects the
 * conversation from the server and the network, not from someone the link was
 * forwarded to.
 */
export async function generateChatKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportChatKey(key: CryptoKey): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

/**
 * Imported non-extractable (the `false` argument), so a stray `exportChatKey` call
 * on a key that arrived from a link cannot leak it back out. Only the key we
 * generated ourselves is extractable, and only long enough to put it in the URL.
 */
export async function importChatKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64Url(encoded), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Fragments are never sent to a server, which is the entire point of storing the key here. */
export function readChatKeyFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(KEY_PARAM);
}
