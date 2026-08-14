import { ConnectionQuality } from 'livekit-client';

/**
 * When a participant's connection is worth saying something about.
 *
 * **Degraded-only, and deliberately colourless.** `code-standards.md` once offered
 * `green-1`/`yellow-1`/`red-1` here, but `signal` *is* `red-1` and
 * `architecture.md` reserves it for the Leave control and your own muted mic. The
 * invariant wins: red meaning exactly two things is worth more than a
 * faster-reading dot, and twelve coloured dots on a twelve-person grid is the
 * noise that invariant exists to prevent. The marker is a word in the tile's
 * label row instead, which the scrim already makes legible and which a screen
 * reader reaches without extra markup.
 *
 * **`Unknown` is not degraded.** It is the value every participant holds before
 * their first quality report arrives, so treating it as bad would mark every tile
 * the instant it mounts and then clear a second later.
 */

/** Five members, not four: the published docs omit `Lost`, which is the one that matters. */
export type QualityLabel = 'weak' | 'connection lost';

export function connectionQualityLabel(quality: ConnectionQuality): QualityLabel | null {
  switch (quality) {
    case ConnectionQuality.Lost:
      return 'connection lost';
    case ConnectionQuality.Poor:
      return 'weak';
    case ConnectionQuality.Excellent:
    case ConnectionQuality.Good:
    case ConnectionQuality.Unknown:
      return null;
  }
}
