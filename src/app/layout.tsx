import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';

import './globals.css';

// Self-hosted at build time — no runtime request to Google. This is the kit's own
// documented substitute for IoskeleyMono, which is licensed and not ours to ship.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'], // Regular + Bold only, per the design system.
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VideoCircle',
  description: 'Start a meeting, share the link, talk. No account needed.',
  icons: { icon: '/brand/mark.svg' },
};

/**
 * Next emits a default viewport tag, so this exists for the two fields it does not
 * set — both of which are about the call on a phone.
 *
 * `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)` return anything at
 * all. Without it every inset resolves to `0`, which means the call surface's
 * safe-area padding has been dead code since feature 09: correct CSS that could
 * never fire. Opting in also means content now extends under the display's cutouts,
 * so `.call-surface` in `globals.css` pays all four insets back — taking the cover
 * without the padding would make a notched phone worse, not better.
 *
 * `interactiveWidget: 'resizes-content'` shrinks the layout viewport when a soft
 * keyboard opens, which is what keeps the chat composer above it. **This is the
 * Android half only.** iOS Safari ignores the field and needs a `visualViewport`
 * treatment; feature 25 owns that, with a real device in hand.
 *
 * Deliberately absent: `maximumScale` and `userScalable`. Next supports both, and
 * both disable pinch-zoom — an accessibility regression, and this product's mobile
 * target is real usability rather than an app-like shell. `colorScheme` is absent
 * too: `color-scheme: dark` is already declared in `globals.css`, and the same
 * specific in two files is exactly what drifts.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-canvas text-ink font-mono antialiased">{children}</body>
    </html>
  );
}
