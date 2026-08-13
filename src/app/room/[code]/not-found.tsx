import Link from 'next/link';

/**
 * Covers both a malformed code and a well-formed one that names no meeting. The
 * two are deliberately not distinguished: telling a stranger which unknown codes
 * are merely misspelt and which are real-but-not-theirs would turn this page into
 * a way to probe for live meetings.
 */
export default function RoomNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 text-left">
        <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
          <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
          No such meeting
        </p>
        <h1 className="text-ink text-2xl leading-tight">This link does not open a meeting.</h1>
        <p className="text-ink-2 text-sm leading-normal">
          It may have been mistyped, or the meeting may have finished — meeting links stop working
          once the meeting is over.
        </p>
        <Link
          href="/"
          className="border-line/60 text-ink hover:bg-card ease-out-quint flex min-h-11 items-center justify-center rounded-sm border px-4 text-xs tracking-wider uppercase transition-colors duration-150"
        >
          Start a new meeting
        </Link>
      </div>
    </main>
  );
}
