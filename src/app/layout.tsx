import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-canvas text-ink font-mono antialiased">{children}</body>
    </html>
  );
}
