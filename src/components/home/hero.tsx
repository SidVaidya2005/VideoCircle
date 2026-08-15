import { CallPreview } from '@/components/home/call-preview';
import { JoinForm } from '@/components/home/join-form';
import { ScopeCanvas } from '@/components/home/scope-canvas';
import { AnnotationLabel } from '@/components/ui/annotation-label';
import { SectionOverline } from '@/components/ui/section-overline';
import { StartMeeting } from '@/components/home/start-meeting';
import { Wordmark } from '@/components/shell/wordmark';

/**
 * The landing hero, and the page's two entry points: start a meeting (F06) or
 * join one with a code (F05). Signing in lives in the header, as of F04.
 *
 * Both sit inline rather than behind a button that reveals them — a control whose
 * only job is to show a form is a click toward something that could already be on
 * screen. Starting a meeting replaces its own button with the share panel, so the
 * link appears where the user was already looking.
 *
 * The wordmark and the paragraph stay full-width above the two-column row rather
 * than sitting in the left column: at `.wordmark-hero`'s clamped size the mark
 * measures ~528px, which does not fit half of a 1024px screen, so putting it in a
 * column would silently clamp it back down to the size it had before.
 */
export function Hero() {
  return (
    // `relative` anchors the axis rules and the corner annotation. The whisper
    // bottom border every other band carries is deliberately absent — the red
    // rule replaces it rather than joining it, so there is one line here, not two.
    //
    // `.hero-viewport` fills the screen below the sticky header — a min-height,
    // not a height, so the content still pushes it taller on a short viewport
    // rather than being clipped. The padding stays as the floor for that case.
    // The vertical rhythm is tighter than the other bands' `py-16 sm:py-24`: this
    // section now carries a two-column row and a full-width scope, and at the kit's
    // usual padding the whole thing outgrew the viewport it is supposed to fill —
    // which put the scope and the axis rule, the two widest things on the page,
    // below the fold.
    <section className="grid-backdrop hero-viewport relative flex flex-col justify-center gap-8 px-4 py-12 sm:px-6">
      {/* Instrument furniture, pinned to the frame rather than the content: the
          kit annotates a scope in its corners and runs an axis down its left
          edge. Decorative, so it is hidden from assistive tech.

          It carries NO numeric readout, unlike `EasingsVisualizer`'s boxed `1.0`.
          Nothing on this page is on a scale, and a tick claiming a value that
          does not exist is an instrument that lies. Geometry only. */}
      <span aria-hidden="true" className="absolute top-4 left-4 sm:left-6">
        <AnnotationLabel>home.entry</AnnotationLabel>
      </span>
      <span
        aria-hidden="true"
        className="bg-line/60 absolute top-16 bottom-0 left-4 w-px sm:left-6"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <SectionOverline>No account · No install</SectionOverline>

          {/* `.wordmark-hero` carries the size: a clamp between type-ramp steps,
              which no utility can express. See globals.css. */}
          <h1 className="wordmark-hero leading-tight">
            <Wordmark />
          </h1>

          <p className="text-ink-2 sm:text-md text-base leading-normal">
            Start a meeting, share the link, talk. Whoever opens it joins straight from the browser
            — no download, no meeting ID, no account.
          </p>
        </div>

        {/* Two columns only from lg:. Below it the preview would be a third of a
            phone screen tall and the entry controls would be pushed under the
            fold by a picture of what happens after you use them. */}
        {/* `lg:items-start`, not centred: the entry controls are a third the
            preview's height, and centring them floats the primary action in a
            pocket of its own making. Aligned to the panel's top edge they read as
            the first thing in the row, which is what they are. */}
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="flex flex-col items-center gap-5 lg:items-start">
            <StartMeeting />
            <JoinForm />

            <p className="text-faint text-center text-xs leading-normal lg:text-left">
              Sign in with Google only if you want your call history.
            </p>
          </div>

          <CallPreview className="w-full" />
        </div>
      </div>

      {/* Outside the max-w-5xl container so the row is free to run wider than the
          text is allowed to. */}
      <ScopeCanvas />

      {/* The scope's axis, and the page's datum: the kit annotates its canvases
          with a red rule ending in a square, and Home carries the grid backdrop
          without it.

          HERO ONLY. `HowItWorks` and `FeatureGrid` keep their whisper borders —
          three red rules down one page would spend the signal colour on section
          dividers, which is exactly what "used sparingly" forbids. One axis reads
          as a datum; three read as a theme.

          The square straddles the rule rather than sitting above it, so the line
          terminates in it. That puts its lower half over the next section, which
          is the kit's own bleed-past-the-frame gesture. */}
      <span aria-hidden="true" className="bg-signal absolute inset-x-0 bottom-0 h-px" />
      <span
        aria-hidden="true"
        className="bg-signal absolute right-0 bottom-0 size-2 translate-y-1/2"
      />
    </section>
  );
}
