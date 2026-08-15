import type { Page } from '@playwright/test';

/**
 * Evidence gathering for the mic-across-a-reconnect failure.
 *
 * The failure is rare (once in eighteen runs), load-dependent, and silent: the
 * microphone comes back unmuted from a blip nobody chose. Reading the SDK proved
 * every path it owns preserves mute intent — `republishAllTracks` guards
 * `restartTrack()` behind `!track.isMuted`, `handleTrackEnded` fails *toward*
 * mute, and `LocalParticipant.updateInfo` reconciles the server to the client's
 * local value on rejoin. So the mechanism is not in the code that can be read.
 *
 * What no assertion currently captures is **which reconnect happened**. A resume
 * keeps its `RTCPeerConnection`s; a full restart builds new ones and republishes
 * every track. Those are entirely different code paths, and a run that fails
 * without saying which one it took cannot be diagnosed however many times it is
 * repeated. Hence: instrument first, then loop.
 *
 * Everything here patches a browser primitive from an init script, which is the
 * same shape `stubDisplayMedia` and `chat.spec.ts` already use — nothing
 * test-only is threaded through production code.
 */

export interface ReconnectEvent {
  /** Milliseconds since this document started, so events can be read as a sequence. */
  at: number;
  kind: 'peer-connection' | 'get-user-media' | 'track-enabled' | 'track-clone' | 'socket';
  detail: string;
}

export interface AudioTrackState {
  id: string;
  enabled: boolean;
  readyState: string;
  /** The browser's own muted flag — not LiveKit's, which lives on the publication. */
  muted: boolean;
}

export interface ReconnectEvidence {
  events: readonly ReconnectEvent[];
  audioTracks: readonly AudioTrackState[];
}

interface ReconnectLog {
  events: ReconnectEvent[];
  audioTracks: MediaStreamTrack[];
}

/**
 * Installs the recorders. Must run before any page script, because the lobby asks
 * for media on mount and the room builds its peer connections seconds later.
 */
export async function recordReconnectEvidence(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const start = Date.now();
    const log: ReconnectLog = { events: [], audioTracks: [] };
    Object.defineProperty(window, '__reconnectLog', { value: log });

    function record(kind: ReconnectEvent['kind'], detail: string): void {
      log.events.push({ at: Date.now() - start, kind, detail });
    }

    /** Short enough to read in a dump, long enough to tell two tracks apart. */
    function short(id: string): string {
      return id.slice(0, 8);
    }

    function remember(track: MediaStreamTrack): void {
      if (track.kind === 'audio' && !log.audioTracks.includes(track)) {
        log.audioTracks.push(track);
      }
    }

    // The discriminator the whole investigation turns on. A resume reuses its
    // peer connections; a full restart constructs new ones, and only the restart
    // path unpublishes and republishes tracks.
    const OriginalPeerConnection = window.RTCPeerConnection;
    class RecordingPeerConnection extends OriginalPeerConnection {
      constructor(...args: ConstructorParameters<typeof OriginalPeerConnection>) {
        super(...args);
        record('peer-connection', 'constructed');
      }
    }
    window.RTCPeerConnection = RecordingPeerConnection;

    // Muting an audio track without stopping it is a write to `enabled`, so this
    // records every mute and unmute — including any the SDK performs on its own.
    const enabledDescriptor = Object.getOwnPropertyDescriptor(
      MediaStreamTrack.prototype,
      'enabled',
    );
    const readEnabled = enabledDescriptor?.get;
    const writeEnabled = enabledDescriptor?.set;
    if (readEnabled && writeEnabled) {
      Object.defineProperty(MediaStreamTrack.prototype, 'enabled', {
        configurable: true,
        get(this: MediaStreamTrack): boolean {
          return readEnabled.call(this) as boolean;
        },
        set(this: MediaStreamTrack, value: boolean) {
          record('track-enabled', `${this.kind} ${short(this.id)} := ${value}`);
          writeEnabled.call(this, value);
        },
      });
    }

    // A `restartTrack()` shows up here as a fresh acquisition, which is what
    // distinguishes "the SDK reopened the device" from "the SDK flipped a flag".
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await originalGetUserMedia(constraints);
      for (const track of stream.getTracks()) {
        record('get-user-media', `${track.kind} ${short(track.id)}`);
        remember(track);
      }
      return stream;
    };

    // livekit-client clones what it is handed and stops the original, so the
    // track that actually carries the call is the clone — the same trap
    // `stubDisplayMedia` documents for screen share.
    const originalClone = MediaStreamTrack.prototype.clone;
    MediaStreamTrack.prototype.clone = function clone(this: MediaStreamTrack): MediaStreamTrack {
      const cloned = originalClone.call(this);
      record('track-clone', `${this.kind} ${short(this.id)} → ${short(cloned.id)}`);
      remember(cloned);
      return cloned;
    };

    // The signal channel. Its close and reopen bracket whichever reconnect ran.
    const OriginalWebSocket = window.WebSocket;
    class RecordingWebSocket extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        const path = new URL(String(url), window.location.href).pathname;
        record('socket', `open ${path}`);
        this.addEventListener('close', (event) => {
          record('socket', `close ${path} code=${(event as CloseEvent).code}`);
        });
      }
    }
    window.WebSocket = RecordingWebSocket;
  });
}

/** Reads the recording back, plus the settled state of every audio track seen. */
export function readReconnectEvidence(page: Page): Promise<ReconnectEvidence> {
  return page.evaluate(() => {
    const log = (window as unknown as { __reconnectLog?: ReconnectLog }).__reconnectLog;
    if (!log) throw new Error('no recording — was recordReconnectEvidence installed?');

    return {
      events: log.events,
      audioTracks: log.audioTracks.map((track) => ({
        id: track.id.slice(0, 8),
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
      })),
    };
  });
}
