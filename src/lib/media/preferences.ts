import { z } from 'zod';

/**
 * Where the lobby remembers how you last set yourself up.
 *
 * One key, not four: the four values are written together on every change, so
 * splitting them buys nothing and risks a half-updated set if one write fails.
 */
const STORAGE_KEY = 'vc.lobby.preferences';

/**
 * `localStorage` is user-editable, so this is a trust boundary like any request
 * body and gets the same treatment. A hand-edited or half-written value must
 * degrade to defaults rather than propagate a wrong type into the device layer.
 */
const PreferencesSchema = z.object({
  cameraId: z.string().optional(),
  microphoneId: z.string().optional(),
  cameraOn: z.boolean(),
  microphoneOn: z.boolean(),
});

export type LobbyPreferences = z.infer<typeof PreferencesSchema>;

/** Both on: someone who opened a video call almost always meant to be seen. */
export const DEFAULT_PREFERENCES: LobbyPreferences = {
  cameraOn: true,
  microphoneOn: true,
};

export function readPreferences(): LobbyPreferences {
  // Called from effects and handlers, but guarded anyway so the module stays
  // safe to import from anywhere.
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = PreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    // Unreadable storage (Safari private mode throws on access) or malformed
    // JSON. Neither is worth surfacing: the lobby simply starts from defaults.
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(preferences: LobbyPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Quota exceeded, or storage disabled entirely. Losing a preference is not
    // worth interrupting someone who is trying to join a call.
  }
}

/**
 * Which remembered device the picker should show as selected.
 *
 * Only for display. Acquisition passes the stored id straight through as a bare
 * `deviceId`, which is an *ideal* constraint rather than `{exact: …}` — so a
 * device that has been unplugged, or whose id the browser rotated when site
 * permissions were reset, quietly falls back to the default instead of failing
 * the request. The picker still needs this, because showing a selected device
 * that is not in the list would leave the control looking wrong.
 */
export function resolveDeviceId(
  preferred: string | undefined,
  available: MediaDeviceInfo[],
): string | undefined {
  if (!preferred) return undefined;
  return available.some((device) => device.deviceId === preferred) ? preferred : undefined;
}
