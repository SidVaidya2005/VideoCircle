'use client';

import { useId } from 'react';

import { resolveDeviceId } from '@/lib/media/preferences';
import { cn } from '@/lib/utils';

interface DevicePickerProps {
  label: string;
  devices: MediaDeviceInfo[];
  selectedId: string | undefined;
  disabled?: boolean;
  onSelect: (deviceId: string) => void;
  className?: string;
}

/**
 * A native `<select>`, deliberately.
 *
 * It is keyboard and screen-reader correct for free, it renders as the platform
 * wheel on iOS — which is far easier one-handed than a custom listbox — and it
 * needs no new dependency. `color-scheme: dark` on `<html>` already makes the
 * native control render dark, so it does not fight the palette.
 */
export function DevicePicker({
  label,
  devices,
  selectedId,
  disabled = false,
  onSelect,
  className,
}: DevicePickerProps) {
  const id = useId();
  const empty = devices.length === 0;

  // A remembered device that is no longer plugged in must not show as selected —
  // the browser is using the default, and the control should say so.
  const value = resolveDeviceId(selectedId, devices) ?? '';

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-muted text-xs tracking-wider uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled || empty}
        onChange={(event) => onSelect(event.target.value)}
        className={cn(
          'border-line/60 bg-raised text-ink min-h-11 w-full min-w-0 rounded-xs border px-3',
          // 16px: below it, iOS Safari zooms the viewport on focus.
          'text-base outline-none',
          'focus-visible:ring-active focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {empty ? (
          <option value="">No devices found</option>
        ) : (
          <>
            {/* Present only until a device is chosen, so the control never shows
                a blank row once it has a real value. */}
            {value === '' ? <option value="">System default</option> : null}
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {/* Labels are empty until media permission is granted. A numbered
                    fallback beats a row of blanks. */}
                {device.label || `${label} ${index + 1}`}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
