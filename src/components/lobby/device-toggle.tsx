'use client';

import { cn } from '@/lib/utils';

interface DeviceToggleProps {
  label: string;
  on: boolean;
  busy: boolean;
  /**
   * Red while off. Reserved for your *own* microphone — one of only two places
   * the design system allows `signal`, the other being the Leave control. The
   * camera passes this as false: twelve red badges on a grid would destroy the
   * signal, and off-camera is not a warning.
   */
  signalWhenOff?: boolean;
  onChange: (on: boolean) => void;
}

export function DeviceToggle({
  label,
  on,
  busy,
  signalWhenOff = false,
  onChange,
}: DeviceToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-busy={busy}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={cn(
        'ease-out-quint flex min-h-11 flex-none items-center justify-center gap-2 rounded-md border px-4',
        'text-xs tracking-wider uppercase transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // The kit's press-state inversion: an engaged control is a white fill
        // with dark text, never a coloured one. `active` is that fill.
        on && 'bg-active text-canvas hover:bg-active-hover border-transparent',
        !on && signalWhenOff && 'border-signal/60 text-signal bg-transparent',
        !on && !signalWhenOff && 'border-line/60 bg-raised text-ink-2',
      )}
    >
      {label} {on ? 'on' : 'off'}
    </button>
  );
}
