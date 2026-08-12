import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Pinned explicitly: Turbopack otherwise walks up looking for a lockfile and can
    // settle on a directory above the repository, which changes what it resolves.
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
};

export default nextConfig;
