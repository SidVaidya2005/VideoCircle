import { SectionOverline } from '@/components/home/section-overline';

const FEATURES = [
  {
    title: 'No account',
    body: 'Guests open the link and join. Signing in is optional, and only buys call history.',
    chip: 'no sign-up',
  },
  {
    title: 'Encrypted chat',
    body: 'Messages are AES-GCM encrypted in the browser. The key rides the link fragment.',
    chip: 'never sent to us',
  },
  {
    title: 'Screen sharing',
    body: 'Share a window or a whole screen. The layout switches to spotlight for everyone.',
    chip: 'getDisplayMedia',
  },
  {
    title: 'Call history',
    body: 'Sign in with Google to see which meetings you joined, for how long, and with whom.',
    chip: '/history',
  },
  {
    title: 'Built for phones',
    body: 'Every layout starts at 360px and every control clears a 44px target.',
    chip: '360px first',
  },
  {
    title: 'Nothing to install',
    body: 'It runs in the browser you already have. No extension, no desktop app.',
    chip: 'webrtc',
  },
] as const;

export function FeatureGrid() {
  return (
    <section className="border-line/60 border-b px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <SectionOverline>What you get</SectionOverline>
          <h2 className="max-w-2xl text-xl leading-snug sm:text-2xl">
            Everything a call needs. Nothing it doesn&apos;t.
          </h2>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              // The kit's card hover: the whisper border warms toward signal.
              // Border only — a red fill would compete with the Leave control.
              className="bg-card border-line/60 hover:border-signal/50 ease-out-quint flex flex-col gap-3 rounded-lg border p-5 transition-colors duration-(--duration-base) hover:duration-[50ms]"
            >
              <h3 className="flex items-center gap-2 text-md leading-snug">
                <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
                {feature.title}
              </h3>
              <p className="text-ink-2 flex-1 text-sm leading-normal">{feature.body}</p>
              <code className="bg-raised border-line/60 text-muted self-start rounded-xs border px-2 py-1 text-xs">
                {feature.chip}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
