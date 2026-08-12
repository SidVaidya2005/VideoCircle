import { CallPreview } from '@/components/home/call-preview';
import { JoinForm } from '@/components/home/join-form';
import { SectionOverline } from '@/components/home/section-overline';
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

          <div className="flex w-full flex-col items-center gap-5">
            <StartMeeting />
            <JoinForm />
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
