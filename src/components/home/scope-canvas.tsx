import { cn } from '@/lib/utils';

interface ScopeCanvasProps {
  className?: string;
}

/**
 * Odd, so there is a true centre for the stagger to radiate from — and sized for
 * the widest tier, with the narrower ones hiding squares symmetrically off both
 * ends. Hiding in pairs is what keeps `CENTRE_INDEX` the centre of whatever is
 * actually on screen, so the stagger still radiates from the middle at every
 * width rather than from a point that has drifted off to one side.
 */
const SQUARE_COUNT = 13;
const CENTRE_INDEX = (SQUARE_COUNT - 1) / 2;
const STAGGER_STEP_MS = 55;

/**
 * How far from the centre a square may sit before it needs room to appear. Two
 * tiers, because 13 squares is few enough that `sm:` can show all of them —
 * measured, not guessed: at 28px a side with a 10px gap the full row spans 484px
 * inside the 608px a 640px viewport leaves after padding, and the phone tier's
 * 9 squares at 16px with a 6px gap span 192px inside 328px at 360px.
 */
const PHONE_REACH = 4;

function visibilityClass(distance: number): string {
  return distance <= PHONE_REACH ? '' : 'hidden sm:inline-block';
}

/**
 * The hero's scope: squares drifting across the grid backdrop, staggered from the
 * centre outwards. Adapted from `ui_kits/playground/ScopeCanvas.jsx`, which is
 * reference rather than a recipe — the upstream file is inline styles and raw
 * hex, and it demos an animation library rather than a product.
 *
 * Two deliberate departures from it, and one deliberate agreement:
 *
 * EVERY SQUARE IS RED, as upstream. This is the single largest use of the signal
 * colour in the product and it is a decision, not an oversight — see
 * `Design/README.md` → Colours, which carries it as a named exception. It holds
 * because nothing here is UI: the row carries no state and is `aria-hidden`, so
 * it cannot compete with the Leave control or a muted-mic warning for meaning,
 * which is the same argument the wordmark's red square rests on. It also never
 * shares a screen with a call — Home and the call are different routes.
 *
 * NO PANEL AND NO INNER GRID. Upstream draws its own grid because it is a panel
 * on a plain page. The hero already carries `.grid-backdrop`, so a second grid
 * inside it would double the backdrop — noise the design system rules out.
 *
 * NO PLAY/PAUSE. A control that does nothing for the product, in the tab order.
 * `prefers-reduced-motion` already collapses the loop, which is the need it
 * appears to serve.
 */
export function ScopeCanvas({ className }: ScopeCanvasProps) {
  return (
    // `overflow-hidden` is load-bearing, not tidiness: a transform contributes to
    // scrollable overflow, so squares drifting up to 6rem past the row would put
    // a horizontal scrollbar on Home at the widths where the row is nearly as
    // wide as the viewport. Upstream clips for the same reason. It also gives the
    // kit's bleed — the outermost squares run off the frame rather than stopping
    // politely inside it.
    <div aria-hidden="true" className={cn('w-full overflow-hidden', className)}>
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
        {Array.from({ length: SQUARE_COUNT }, (_, index) => {
          const distance = Math.abs(index - CENTRE_INDEX);

          return (
            <span
              key={index}
              className={cn(
                'scope-square animate-scope-drift bg-signal shrink-0 rounded-xs',
                'size-4 sm:size-7',
                visibilityClass(distance),
              )}
              style={{
                // Distance from the centre, so the row moves outwards in pairs.
                // Computed per index, so it cannot live in a utility class.
                animationDelay: `${distance * STAGGER_STEP_MS}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
