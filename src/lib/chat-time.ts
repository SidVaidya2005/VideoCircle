const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long ago a message landed, in the product's own register.
 *
 * Terse and lowercase, like room codes and every other identifier here —
 * `Intl.RelativeTimeFormat` would produce "2 minutes ago", which reads nothing
 * like the rest of the interface and takes three times the width in a 288px panel.
 *
 * Pure and taking `now` as an argument so every boundary is testable without a
 * clock. The caller supplies a value that changes on a slow interval; nothing here
 * reads the time itself.
 */
export function formatChatTime(receivedAt: number, now: number): string {
  // A clock that has gone backwards, or a message from the same instant. Both
  // read as the present rather than as a negative age.
  const elapsed = Math.max(0, now - receivedAt);

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;

  return `${Math.floor(elapsed / DAY)}d`;
}
