'use client';

import { useEffect, useRef } from 'react';

import { isPlainKeypress, isTypingElement } from '@/lib/keyboard';

interface CallShortcuts {
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
}

/** Lowercase, so the handler is not fooled by caps lock. Shift is excluded anyway. */
const KEYS = { microphone: 'd', camera: 'e' } as const;

/**
 * `d` and `e`, bound for the length of the call.
 *
 * The handlers are held in a ref so the listener is attached once rather than
 * re-attached on every render — the bar re-renders whenever a device toggles, and
 * a listener that detached and reattached each time would drop a keystroke landing
 * in the gap.
 */
export function useCallShortcuts({ onToggleMicrophone, onToggleCamera }: CallShortcuts): void {
  const handlers = useRef({ onToggleMicrophone, onToggleCamera });

  // Written in an effect, never during render: a ref mutated while rendering is
  // read by whatever else renders in the same pass.
  useEffect(() => {
    handlers.current = { onToggleMicrophone, onToggleCamera };
  }, [onToggleMicrophone, onToggleCamera]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isPlainKeypress(event)) return;

      // The DOM read stays here; the decision is a pure module so it can be
      // tested without a browser.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        isTypingElement(target.tagName, target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === KEYS.microphone) {
        event.preventDefault();
        handlers.current.onToggleMicrophone();
      } else if (key === KEYS.camera) {
        event.preventDefault();
        handlers.current.onToggleCamera();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
