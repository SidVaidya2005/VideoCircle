import { cn } from '@/lib/utils';

interface WordmarkProps {
  className?: string;
}

/**
 * The VideoCircle wordmark, as live text rather than an image — it is a mono
 * wordmark, so real text stays crisp at every size, scales with the type ramp,
 * and is readable by a screen reader. `public/brand/wordmark.svg` exists only for
 * contexts where live text is unavailable: OG images, README embeds, decks.
 *
 * Set in PascalCase, with a red square separating the two words. That square is
 * the brand's only native glyph and is exactly what `assets/mark.svg` is, so the
 * favicon reads as a compression of the wordmark.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    // role="img" + aria-label so assistive tech announces the brand name as one
    // word. The separator is decoration, not punctuation: nothing should read a
    // pause between "Video" and "Circle", and an empty inline box between two
    // text nodes is announced inconsistently across screen readers.
    <span
      role="img"
      aria-label="VideoCircle"
      className={cn('text-ink inline-block font-bold', className)}
    >
      Video
      <span aria-hidden="true" className="wordmark-dot" />
      Circle
    </span>
  );
}
