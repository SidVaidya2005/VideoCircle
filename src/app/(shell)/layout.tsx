import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';

/**
 * Chrome for Home and Call History.
 *
 * `/room/[code]` deliberately sits OUTSIDE this group: the call is a full-bleed
 * `dvh` surface with fixed top status and bottom controls, and a footer would
 * both break that layout and steal vertical space on the phones where it is
 * tightest. Keeping the exclusion structural means a new page cannot inherit a
 * footer into the call by forgetting to opt out.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {/* flex-col so a page can `flex-1` to fill the region — `min-h-full` on the
          child does not resolve against a flex item with an auto basis. */}
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
