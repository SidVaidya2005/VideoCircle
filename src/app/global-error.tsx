'use client'; // Error boundaries must be Client Components.

import { JetBrains_Mono } from 'next/font/google';

import './globals.css';

/**
 * The boundary for a failure in the root layout itself.
 *
 * `error.tsx` wraps every route's page, loading and not-found — but **not** the
 * layout above it in the same segment. When the root layout is what threw, this
 * replaces the whole document, which is why it renders its own `<html>` and
 * `<body>`: there is no layout left to provide them.
 *
 * It also has to bring its own everything. Next does not apply global styles to
 * this file or to the built-in 500 page, so `globals.css` is imported here
 * directly and the typeface is loaded again — without both, the one screen that
 * says the app is broken would be the one screen that looks like a different
 * product. `next/font` deduplicates by configuration, so this is the same
 * self-hosted family the root layout loads, not a second download.
 *
 * Deliberately thinner than `error.tsx` and with no retry: if the root layout
 * cannot render, re-rendering its children is not a plausible recovery. A full
 * navigation is, which is what the link does — a plain `<a>`, because `next/link`
 * needs the router this document no longer has.
 */

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // Logged, never rendered: a digest is a hash that means something only against
  // server logs, and `code-standards.md` forbids a code in user-facing copy.
  console.error('[app] root layout failed', error);

  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-canvas text-ink font-mono antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
          <div className="flex w-full max-w-md flex-col gap-4 text-left">
            <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
              <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
              Something went wrong
            </p>

            <h1 className="text-ink text-2xl leading-tight">VideoCircle could not start.</h1>
            <p className="text-ink-2 text-sm leading-normal">
              Reloading usually fixes this. If it keeps happening, the service may be having
              trouble.
            </p>

            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                A plain anchor is the point, not an oversight. `next/link` does a
                client-side navigation through the router, and the root layout —
                which is what just failed — is above the router in the tree, so a
                soft navigation would re-render straight back into the broken
                layout. A full document load is the only recovery available here,
                and that is exactly what an <a> does. */}
            <a
              href="/"
              className="border-line/60 text-ink hover:bg-card ease-out-quint flex min-h-11 items-center justify-center rounded-sm border px-4 text-xs tracking-wider uppercase transition-colors duration-150"
            >
              Reload VideoCircle
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
