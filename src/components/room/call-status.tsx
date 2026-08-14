'use client';

import { useConnectionState, useLocalParticipant } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

/**
 * What the status strip reads in each connection state.
 *
 * `SignalReconnecting` is folded into `Reconnecting`: the distinction is which
 * connection dropped, which is ours to handle and not the participant's to read.
 */
const STATUS: Record<ConnectionState, string> = {
  [ConnectionState.Disconnected]: 'Disconnected',
  [ConnectionState.Connecting]: 'Connecting',
  [ConnectionState.Connected]: 'Connected',
  [ConnectionState.Reconnecting]: 'Reconnecting',
  [ConnectionState.SignalReconnecting]: 'Reconnecting',
};

/**
 * The left of the status strip: what the connection is doing, or that you are
 * sharing your screen.
 *
 * Sharing replaces the connection line rather than sitting beside it — a call you
 * are presenting to is a call that is connected, so the two never need saying at
 * once, and the strip stays one line at 360px.
 *
 * Its own leaf so the stage does not re-render on local track events, and so the
 * banner and the line it replaces live in one place.
 */
export function CallStatus() {
  const state = useConnectionState();
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();

  const reconnecting =
    state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;

  if (reconnecting) {
    return (
      // A banner, not the quiet line every other state gets. During a reconnect
      // the video is frozen, and a small grey word at the top of a still picture
      // reads as a call that has died rather than one that is coming back — which
      // is exactly when someone gives up and leaves a call that would have
      // recovered on its own.
      //
      // Polite, not assertive: this resolves by itself, and an assertive region
      // would interrupt whatever a screen reader was already saying.
      <div
        aria-live="polite"
        className="border-line/60 bg-raised flex w-full items-center gap-2 rounded-md border px-3 py-2"
      >
        {/* Static, never the looping live-dot: a continuous keyframe inside a call
            competes with video encoding on whatever device is weakest. White
            rather than red — recovering is a state, not a destructive action. */}
        <span aria-hidden="true" className="bg-active size-1.5 flex-none" />
        <p className="text-ink text-xs tracking-wider uppercase">{STATUS[state]}</p>
        <p className="text-muted truncate text-xs tracking-wider uppercase">
          — trying to restore the connection
        </p>
      </div>
    );
  }

  // Below reconnecting, deliberately. Sharing used to be checked first, which
  // meant a reconnect *during* a share was invisible: the more urgent of the two
  // states lost to the one the person already knows about, because they chose it.
  if (isScreenShareEnabled) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        {/* Polite: this announces a state the person just chose themselves. */}
        <p aria-live="polite" className="text-ink truncate text-xs tracking-wider uppercase">
          Sharing your screen
        </p>
        {/* min-h-11 and the horizontal padding are the 44px floor, not decoration.
            A text link in a status strip is exactly where a hit area quietly ends
            up at 16px tall. */}
        <button
          type="button"
          onClick={() => void localParticipant.setScreenShareEnabled(false)}
          className="text-muted hover:text-ink ease-out-quint focus-visible:ring-active focus-visible:ring-offset-canvas inline-flex min-h-11 flex-none items-center px-3 text-xs tracking-wider uppercase underline underline-offset-4 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Stop
        </button>
      </div>
    );
  }

  return (
    // Polite, not assertive: a reconnect resolves on its own, and an assertive
    // region would interrupt whatever a screen reader was already saying.
    <p
      aria-live="polite"
      className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase"
    >
      {STATUS[state]}
    </p>
  );
}
