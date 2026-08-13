import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  readPreferences,
  resolveDeviceId,
  writePreferences,
} from '@/lib/media/preferences';

const KEY = 'vc.lobby.preferences';

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * `localStorage` is user-editable, so every one of these is a value someone can
 * actually put there by hand. None may reach the device layer as-is.
 */
describe('readPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults for malformed JSON', () => {
    storage.setItem(KEY, '{not json');
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when a field has the wrong type', () => {
    storage.setItem(KEY, JSON.stringify({ cameraOn: 'yes', microphoneOn: true }));
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when a required field is missing', () => {
    storage.setItem(KEY, JSON.stringify({ cameraOn: false }));
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('reads a valid stored set', () => {
    const stored = {
      cameraOn: false,
      microphoneOn: true,
      cameraId: 'cam-1',
      microphoneId: 'mic-1',
    };
    storage.setItem(KEY, JSON.stringify(stored));

    expect(readPreferences()).toEqual(stored);
  });

  it('survives storage that throws on access', () => {
    // Safari in private mode does exactly this.
    vi.stubGlobal('window', {
      localStorage: {
        getItem() {
          throw new Error('SecurityError');
        },
      },
    });

    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('writePreferences', () => {
  it('round-trips through readPreferences', () => {
    const prefs = { cameraOn: false, microphoneOn: false, cameraId: 'cam-9' };
    writePreferences(prefs);

    expect(readPreferences()).toEqual(prefs);
  });

  it('does not throw when storage is full', () => {
    vi.stubGlobal('window', {
      localStorage: {
        setItem() {
          throw new Error('QuotaExceededError');
        },
      },
    });

    // Losing a preference must never interrupt someone trying to join a call.
    expect(() => writePreferences(DEFAULT_PREFERENCES)).not.toThrow();
  });
});

describe('resolveDeviceId', () => {
  const devices = [{ deviceId: 'cam-1' }, { deviceId: 'cam-2' }] as MediaDeviceInfo[];

  it('keeps a device that is still present', () => {
    expect(resolveDeviceId('cam-2', devices)).toBe('cam-2');
  });

  it('drops a device that has been unplugged', () => {
    // Showing a selected device that is not in the list would leave the picker
    // claiming something the browser is not doing.
    expect(resolveDeviceId('cam-gone', devices)).toBeUndefined();
  });

  it('passes through when nothing was remembered', () => {
    expect(resolveDeviceId(undefined, devices)).toBeUndefined();
  });
});
