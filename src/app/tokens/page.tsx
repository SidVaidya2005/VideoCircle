import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/shell/wordmark';

/**
 * Token specimen sheet — development only.
 *
 * Sits outside the `(shell)` route group: it is a tool, not a product surface,
 * so it carries no header or footer. Compare it side by side with
 * context/Design/preview/*.html when changing anything in globals.css.
 *
 * `notFound()` makes it unreachable in production. The markup still occupies a
 * chunk in the build — for a page of static swatches that is an acceptable
 * trade against the complexity of excluding a route from compilation.
 */

const SURFACES = [
  { name: 'bg-canvas', role: 'page', className: 'bg-canvas' },
  { name: 'bg-card', role: 'card', className: 'bg-card' },
  { name: 'bg-raised', role: 'raised', className: 'bg-raised' },
  { name: 'bg-overlay', role: 'overlay', className: 'bg-overlay' },
  { name: 'bg-lifted', role: 'higher overlay', className: 'bg-lifted' },
] as const;

const TEXT_STEPS = [
  { name: 'text-ink', role: 'primary', className: 'text-ink' },
  { name: 'text-ink-2', role: 'secondary', className: 'text-ink-2' },
  { name: 'text-muted', role: 'tertiary / labels', className: 'text-muted' },
  { name: 'text-faint', role: 'muted / disabled', className: 'text-faint' },
] as const;

const SIGNALS = [
  { name: 'signal', role: 'leave · your own mute', className: 'bg-signal' },
  { name: 'good', role: 'connection quality', className: 'bg-good' },
  { name: 'warn', role: 'connection quality', className: 'bg-warn' },
  { name: 'burst', role: 'logo only — never UI state', className: 'bg-burst' },
] as const;

const TYPE_SCALE = [
  { name: 'text-5xl', className: 'text-5xl' },
  { name: 'text-4xl', className: 'text-4xl' },
  { name: 'text-3xl', className: 'text-3xl' },
  { name: 'text-2xl', className: 'text-2xl' },
  { name: 'text-xl', className: 'text-xl' },
  { name: 'text-lg', className: 'text-lg' },
  { name: 'text-md', className: 'text-md' },
  { name: 'text-base', className: 'text-base' },
  { name: 'text-sm', className: 'text-sm' },
  { name: 'text-xs', className: 'text-xs' },
] as const;

const RADII = [
  { name: 'rounded-xs', role: 'inputs, chips', className: 'rounded-xs' },
  { name: 'rounded-sm', role: 'buttons', className: 'rounded-sm' },
  { name: 'rounded-md', role: 'chip toggles', className: 'rounded-md' },
  { name: 'rounded-lg', role: 'cards, panels', className: 'rounded-lg' },
  { name: 'rounded-xl', role: 'hero panels', className: 'rounded-xl' },
  { name: 'rounded-pill', role: 'pills, dots', className: 'rounded-pill' },
] as const;

const EASINGS = [
  { name: 'ease-out-quint', role: 'most UI transitions', className: 'ease-out-quint' },
  { name: 'ease-in-out-quint', role: 'hero reveals, loops', className: 'ease-in-out-quint' },
  { name: 'ease-out-expo', role: 'entrance staggers', className: 'ease-out-expo' },
] as const;

const TRACKING = [
  { name: 'tracking-tight', className: 'tracking-tight' },
  { name: 'tracking-normal', className: 'tracking-normal' },
  { name: 'tracking-wide', className: 'tracking-wide' },
  { name: 'tracking-wider', className: 'tracking-wider' },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-muted border-line/60 border-b pb-2 text-xs tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function TokensPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted text-xs tracking-wide uppercase">Design system · development only</p>
        <h1 className="text-2xl leading-tight">
          <Wordmark /> tokens
        </h1>
        <p className="text-ink-2 text-sm leading-normal">
          Compare against context/Design/preview/*.html. Every value here comes from the mirror in
          globals.css — nothing on this page carries a literal.
        </p>
      </header>

      <Section title="Elevation ladder">
        <div className="flex flex-col gap-2">
          {SURFACES.map((surface) => (
            <div
              key={surface.name}
              className={`${surface.className} border-line/60 flex items-center justify-between rounded-lg border px-4 py-3`}
            >
              <span className="text-sm">{surface.name}</span>
              <span className="text-muted text-xs tracking-wide uppercase">{surface.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Foreground ladder">
        <div className="bg-card border-line/60 flex flex-col gap-2 rounded-lg border p-4">
          {TEXT_STEPS.map((step) => (
            <div key={step.name} className="flex items-baseline justify-between gap-4">
              <span className={`${step.className} text-base`}>The quick brown fox — 0123456789</span>
              <span className="text-muted shrink-0 text-xs tracking-wide uppercase">
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Signal and status">
        <div className="flex flex-col gap-2">
          {SIGNALS.map((signal) => (
            <div key={signal.name} className="flex items-center gap-3">
              <span className={`${signal.className} size-6 shrink-0 rounded-xs`} />
              <span className="text-sm">{signal.name}</span>
              <span className="text-muted ml-auto text-xs tracking-wide uppercase">
                {signal.role}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((step) => (
            <div key={step.name} className="flex items-baseline gap-4 overflow-x-auto">
              <span className={`${step.className} leading-tight`}>Aa</span>
              <span className="text-muted shrink-0 text-xs tracking-wide uppercase">
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tracking">
        <div className="flex flex-col gap-2">
          {TRACKING.map((step) => (
            <div key={step.name} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={`${step.className} text-sm uppercase`}>Start a meeting</span>
              <span className="text-muted text-xs tracking-wide uppercase">{step.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radii">
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div key={radius.name} className="flex flex-col items-center gap-2">
              <span className={`${radius.className} bg-raised border-line/60 size-16 border`} />
              <span className="text-muted text-xs tracking-wide uppercase">{radius.name}</span>
              <span className="text-faint text-xs">{radius.role}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Easings — hover a swatch">
        <div className="flex flex-col gap-3">
          {EASINGS.map((easing) => (
            <div key={easing.name} className="flex flex-col gap-1">
              <div className="bg-card border-line/60 group h-10 overflow-hidden rounded-sm border">
                <div
                  className={`${easing.className} bg-active h-full w-8 duration-(--duration-slow) group-hover:w-full`}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-xs tracking-wide uppercase">{easing.name}</span>
                <span className="text-faint text-xs">{easing.role}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button — rest, hover, focus, disabled">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Leave</Button>
          <Button disabled>Disabled</Button>
        </div>
        <p className="text-faint text-xs leading-normal">
          Engaged is a white fill, never red. Red is the Leave control and your own muted state.
          Tab through these — focus reuses the inverted fill.
        </p>
      </Section>

      <Section title="Grid backdrop">
        <div className="grid-backdrop border-line/60 h-40 rounded-lg border" />
        <p className="text-faint text-xs leading-normal">
          Home, the lobby, and empty states only. Never behind or over live video.
        </p>
      </Section>
    </main>
  );
}
