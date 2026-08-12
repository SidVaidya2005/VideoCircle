import { SectionOverline } from '@/components/home/section-overline';

const STEPS = [
  {
    n: '01',
    title: 'Start',
    body: 'New meeting mints a random code and a fresh encryption key, in your browser.',
  },
  {
    n: '02',
    title: 'Share',
    body: 'Send the link as plain text. It is the invitation and the chat key together.',
  },
  {
    n: '03',
    title: 'Talk',
    body: 'They open it, set their camera and mic in the lobby, and join. No account.',
  },
] as const;

export function HowItWorks() {
  return (
    <section className="border-line/60 border-b px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <SectionOverline>How it works</SectionOverline>
          <h2 className="max-w-2xl text-xl leading-snug sm:text-2xl">
            Three steps, and none of them is signing up.
          </h2>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="bg-card border-line/60 flex flex-col gap-3 rounded-lg border p-5"
            >
              <span className="text-faint text-xs tracking-wider uppercase">{step.n}</span>
              <h3 className="text-md leading-snug">{step.title}</h3>
              <p className="text-ink-2 text-sm leading-normal">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
