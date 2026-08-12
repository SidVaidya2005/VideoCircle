import Link from 'next/link';

import { Wordmark } from '@/components/shell/wordmark';

interface SiteHeaderProps {
  /** Sign-in control. Filled by feature 04; the header does not know what auth is. */
  actions?: React.ReactNode;
}

export function SiteHeader({ actions }: SiteHeaderProps) {
  return (
    // Sticky, as in the kit's own site nav. --shadow-soft is the design system's
    // one sanctioned shadow: a scroll mask under a sticky header, never a depth
    // cue. Solid bg-canvas rather than a translucent fill — the brand has no
    // backdrop-blur, and semi-opaque chrome over scrolling text reads as muddy.
    <header className="bg-canvas border-line/60 shadow-soft sticky top-0 z-10 border-b px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="VideoCircle home"
          className="focus-visible:ring-active focus-visible:ring-offset-canvas inline-flex min-h-11 items-center rounded-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Wordmark className="text-lg leading-tight" />
        </Link>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
