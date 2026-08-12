import { CallPreview } from '@/components/home/call-preview';
import { SectionOverline } from '@/components/home/section-overline';
import { Wordmark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';

/**
 * The landing hero.
 *
 * The two controls are deliberately inert for now — "New meeting" needs
 * `/api/meetings` (feature 06) and "Join with a code" needs feature 05.
 * build-plan.md's Core Principle is to build the visible surface first and wire
 * the logic behind it, so they are styled and placed but do nothing yet.
 * Sign-in is live as of feature 04, and lives in the header rather than here.
 *
 * TODO: wire "New meeting" to POST /api/meetings in feature 06.
 * TODO: wire "Join with a code" to the join-by-code form in feature 05.
 */
export function Hero() {
  return (
    <section className="grid-backdrop border-line/60 border-b px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <SectionOverline>No account · No install</SectionOverline>

          <h1 className="text-3xl leading-tight sm:text-4xl lg:text-5xl">
            <Wordmark />
          </h1>

          <p className="text-ink-2 text-base leading-normal sm:text-md">
            Start a meeting, share the link, talk. Whoever opens it joins straight from the browser —
            no download, no meeting ID, no account.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button>START A MEETING</Button>
            <Button variant="secondary">JOIN AS GUEST</Button>
          </div>

          <p className="text-faint text-xs leading-normal">
            Sign in with Google only if you want your call history.
          </p>
        </div>

        <CallPreview className="w-full max-w-xl" />
      </div>
    </section>
  );
}
