import { cn } from '@/lib/utils';

interface WordmarkProps {
  className?: string;
}

// U+0131 DOTLESS I, so the red square supplied by .wordmark-i is the only tittle
// on each i. An ordinary "i" would keep its own dot underneath the square.
const DOTLESS_I = 'ı';

/**
 * The VideoCircle wordmark, as live text rather than an image — it is a mono
 * wordmark, so real text stays crisp at every size, scales with the type ramp,
 * and is readable by a screen reader. `public/brand/wordmark.svg` exists only for
 * contexts where live text is unavailable: OG images, README embeds, decks.
 *
 * Set in PascalCase, with BOTH i's carrying a red square tittle.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    // role="img" + aria-label so assistive tech announces "VideoCircle". Without
    // it the accessible name is computed from the split markup — inline-flex makes
    // each inner span a flex item, which inserts word boundaries — and the dotless
    // ı is announced as its own character. The visible text stays live text.
    <span
      role="img"
      aria-label="VideoCircle"
      className={cn('text-ink inline-flex items-start font-bold', className)}
    >
      V<span className="wordmark-i">{DOTLESS_I}</span>deoC
      <span className="wordmark-i">{DOTLESS_I}</span>rcle
    </span>
  );
}
