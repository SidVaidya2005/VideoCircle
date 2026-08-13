'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

/** Tailwind's `lg:` breakpoint, as a query. The one place it is written twice. */
const INLINE_FROM = '(min-width: 64rem)';

interface CallPanelProps {
  /** Wide-tracked CAPS, per the kit — the panel's own overline. */
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * The shell both call panels use — participants now, chat at feature 19.
 *
 * A `Sheet` below `lg:` and an inline column above it. The boundary is `lg:`
 * rather than `sm:` because that is where a side column has room to exist at all,
 * and it is the same breakpoint the spotlight filmstrip switches on — with the
 * panel open the filmstrip goes horizontal, so only one column of chrome ever
 * occupies the right edge.
 *
 * This is the one responsive decision in the call made in JavaScript rather than
 * CSS, and the reason is Radix: an open dialog traps focus, locks body scroll and
 * hides the rest of the page from assistive tech, none of which a `lg:hidden`
 * class can undo — and its content is portaled to `document.body`, out of reach of
 * any wrapper class anyway. Choosing in CSS would leave an invisible dialog
 * holding focus on every desktop.
 *
 * Rendering one form rather than both also means the panel's contents mount once,
 * so a list subscribing to room events does not do it twice.
 */
export function CallPanel({ title, open, onClose, children }: CallPanelProps) {
  const inline = useMediaQuery(INLINE_FROM);

  if (!open) return null;

  if (inline) {
    return (
      <aside
        aria-label={title}
        className="border-line/60 bg-card flex min-h-0 w-72 flex-none flex-col gap-3 overflow-hidden rounded-lg border p-3"
      >
        <p className="text-muted flex-none text-xs tracking-wider uppercase">{title}</p>
        {children}
      </aside>
    );
  }

  return (
    <Sheet open onOpenChange={(next) => (next ? undefined : onClose())}>
      {/* No description: the title names the panel and there is nothing further to
          say. Radix warns unless told so explicitly. */}
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
