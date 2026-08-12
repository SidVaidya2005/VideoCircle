/** Data-channel topics. Both peers must agree, so these are defined once. */
export const DATA_TOPIC = {
  CHAT: 'vc.chat',
  REACTION: 'vc.reaction',
  HAND: 'vc.hand',
} as const;

/** Above this headcount the grid paginates rather than shrinking further. */
export const MAX_VISIBLE_TILES = 12;

/** Reactions disappear on their own; nothing about them is persisted. */
export const REACTION_TTL_MS = 4_000;

export const MAX_DISPLAY_NAME_LENGTH = 48;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

/** Footer links. Rendered on Home and Call History, so they live here, not inline. */
export const AUTHOR_LINKS = [
  { label: 'Source', href: 'https://github.com/SidVaidya2005/VideoCircle' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/siddarth-vaidya-885871239' },
  { label: 'Email', href: 'mailto:siddarthvaidya2005@gmail.com' },
  { label: 'Portfolio', href: 'https://siddarthvaidya2005-7iyf.onrender.com' },
] as const;

export const AUTHOR_BYLINE = 'Built by Siddarth Vaidya';
