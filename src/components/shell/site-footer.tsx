import { AUTHOR_BYLINE, AUTHOR_LINKS } from '@/lib/constants';

/**
 * Author byline and links. Home and Call History only — never the lobby, and
 * never inside the call, which is a full-bleed `dvh` surface with fixed top
 * status and bottom controls. That exclusion is structural: this renders from
 * the `(shell)` route group, and `/room/[code]` sits outside it.
 *
 * Quiet by default — nothing here is `signal`, because red still means Leave.
 */
export function SiteFooter() {
  return (
    <footer className="border-line/60 mt-auto border-t px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-muted text-xs tracking-wide uppercase">{AUTHOR_BYLINE}</p>

        <nav aria-label="Author links">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {AUTHOR_LINKS.map((link, index) => (
              <li key={link.href} className="flex items-center gap-x-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-faint text-xs">
                    ·
                  </span>
                ) : null}
                <a
                  href={link.href}
                  // The mailto: gets neither attribute; the three external links get both.
                  {...(link.href.startsWith('mailto:')
                    ? {}
                    : { target: '_blank', rel: 'noopener noreferrer' })}
                  // min-h-11 / min-w-11: the text stays small, the tap target does not.
                  className="text-muted hover:text-ink focus-visible:bg-active focus-visible:text-canvas inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs px-2 text-xs tracking-wide uppercase transition-colors duration-(--duration-base) ease-in-out hover:duration-[50ms] hover:ease-out focus-visible:outline-none"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
