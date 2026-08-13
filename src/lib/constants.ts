/** Data-channel topics. Both peers must agree, so these are defined once. */
export const DATA_TOPIC = {
  CHAT: 'vc.chat',
  REACTION: 'vc.reaction',
  /**
   * Declared but unused. F15 moved raise-hand onto a LiveKit participant
   * attribute: a data channel cannot tell a late joiner about a hand raised
   * before they arrived, and an unreliable packet can be dropped outright,
   * leaving a hand up on some screens and down on others. Kept here because this
   * list is the record of the wire protocol, and a reserved topic is worth
   * knowing about before something else claims the name.
   */
  HAND: 'vc.hand',
} as const;

/** Above this headcount the grid paginates rather than shrinking further. */
export const MAX_VISIBLE_TILES = 12;

/** Reactions disappear on their own; nothing about them is persisted. */
export const REACTION_TTL_MS = 4_000;

/**
 * The floor between two reactions from one participant. Enforced by the sender
 * and again by every receiver, because only the second stops a peer flooding you.
 */
export const REACTION_MIN_INTERVAL_MS = 1_000;

export const MAX_DISPLAY_NAME_LENGTH = 48;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

/** How long a copy control shows its confirmation before reverting. */
export const COPIED_RESET_MS = 2_000;

/** Footer links. Rendered on Home and Call History, so they live here, not inline. */
export const AUTHOR_LINKS = [
  { label: 'Source', href: 'https://github.com/SidVaidya2005/VideoCircle' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/siddarth-vaidya-885871239' },
  { label: 'Email', href: 'mailto:siddarthvaidya2005@gmail.com' },
  { label: 'Portfolio', href: 'https://siddarthvaidya2005-7iyf.onrender.com' },
] as const;

export const AUTHOR_BYLINE = 'Built by Siddarth Vaidya';
