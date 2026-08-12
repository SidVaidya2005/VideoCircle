'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseRoomCodeInput } from '@/lib/parse-room-code';

const INVALID_MESSAGE =
  'That is not a meeting code. Paste the whole link you were sent, or type the code as abc-defg-hjk.';

/**
 * The guest entry point: a code or a pasted share link goes in, a room navigation
 * comes out.
 *
 * Nothing here talks to a server. Validation is the same `ROOM_CODE_PATTERN` the
 * database CHECK-constrains against, so a code that cannot exist is refused without
 * a round trip — and, more importantly, a pasted link's `#k=` fragment is carried
 * straight to the destination URL without ever being sent anywhere. That is the
 * whole reason the chat key lives in a fragment.
 */
export function JoinForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseRoomCodeInput(value);
    if (!parsed) {
      setInvalid(true);
      return;
    }

    // The fragment rides along exactly as it arrived. router.push keeps this a
    // client-side navigation, so the hash never reaches the network.
    router.push(`/room/${parsed.code}${parsed.fragment}`);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
    // Clear on the first keystroke so the message can never contradict the field.
    if (invalid) setInvalid(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2">
      <label htmlFor={inputId} className="text-muted text-xs tracking-wide uppercase">
        Or join with a code
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          name="code"
          value={value}
          onChange={handleChange}
          placeholder="abc-defg-hjk"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          // iOS Safari capitalises and autocorrects by default, which fights a
          // lowercase-only alphabet on every keystroke.
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          className="text-left sm:flex-1"
        />
        <Button type="submit" className="sm:flex-none">
          JOIN
        </Button>
      </div>

      {invalid ? (
        // Not red: signal belongs to the Leave control and your own muted state.
        <p id={errorId} role="alert" className="text-ink-2 text-left text-xs leading-normal">
          {INVALID_MESSAGE}
        </p>
      ) : null}
    </form>
  );
}
