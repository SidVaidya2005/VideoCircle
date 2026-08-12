import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Both env modules parse at import time, so every case here stubs the environment
 * first, resets the module registry, then imports. Without `resetModules` the
 * second test would get the first test's cached, already-parsed module.
 */

const VALID_PUBLIC = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  NEXT_PUBLIC_LIVEKIT_URL: 'wss://example.livekit.cloud',
} as const;

function stub(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value);
  }
  vi.resetModules();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('public env', () => {
  it('parses a complete, well-formed environment', async () => {
    stub(VALID_PUBLIC);

    const { env } = await import('@/lib/env');

    expect(env.NEXT_PUBLIC_SITE_URL).toBe(VALID_PUBLIC.NEXT_PUBLIC_SITE_URL);
    expect(env.NEXT_PUBLIC_LIVEKIT_URL).toBe(VALID_PUBLIC.NEXT_PUBLIC_LIVEKIT_URL);
  });

  it('throws when a variable is missing', async () => {
    stub({ ...VALID_PUBLIC, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined });

    await expect(import('@/lib/env')).rejects.toThrow();
  });

  it('rejects a LiveKit URL that is not wss://', async () => {
    stub({ ...VALID_PUBLIC, NEXT_PUBLIC_LIVEKIT_URL: 'https://example.livekit.cloud' });

    await expect(import('@/lib/env')).rejects.toThrow();
  });

  it('rejects a site URL that is not a URL', async () => {
    stub({ ...VALID_PUBLIC, NEXT_PUBLIC_SITE_URL: 'localhost:3000' });

    await expect(import('@/lib/env')).rejects.toThrow();
  });

  it('does not expose secrets', async () => {
    stub({ ...VALID_PUBLIC, SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' });

    const { env } = await import('@/lib/env');

    // The public schema strips unknown keys, so a secret cannot ride along into a
    // client bundle by accident.
    expect(Object.keys(env)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
