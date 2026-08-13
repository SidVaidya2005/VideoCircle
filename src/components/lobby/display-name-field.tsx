'use client';

import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { MAX_DISPLAY_NAME_LENGTH } from '@/lib/constants';

interface DisplayNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * The name everyone else in the call will see.
 *
 * Prefilled from the signed-in profile but left editable: nothing here writes
 * back to `profiles`, and `meeting_participants.display_name` is a snapshot
 * captured at join, which is exactly what a per-meeting name is. Joining a
 * client call as "Sid (Acme)" is a normal thing to want.
 */
export function DisplayNameField({ value, onChange }: DisplayNameFieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);

  // Only after they have interacted — an empty field on arrival is where a guest
  // starts, not a mistake they have made.
  const invalid = touched && value.trim().length === 0;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-muted text-xs tracking-wider uppercase">
        Your name
      </label>
      <Input
        id={id}
        value={value}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        autoComplete="name"
        placeholder="Who are you joining as?"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onBlur={() => setTouched(true)}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="text-ink-2 text-xs leading-normal">
          Everyone in the call sees this name, so it cannot be empty.
        </p>
      ) : null}
    </div>
  );
}
