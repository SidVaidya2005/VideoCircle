import type { Metadata } from 'next';

import './globals.css';

// JetBrains Mono and the brand token classes arrive in feature 02 with the design
// system. This layout stays structural until then.
export const metadata: Metadata = {
  title: 'VideoCircle',
  description: 'Start a meeting, share the link, talk. No account needed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
