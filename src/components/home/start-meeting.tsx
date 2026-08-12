'use client';

import { useState } from 'react';
import { z } from 'zod';

import { SharePanel } from '@/components/home/share-panel';
import { Button } from '@/components/ui/button';
import { exportChatKey, generateChatKey } from '@/lib/crypto/chat-key';
import { isValidRoomCode } from '@/lib/room-code';

// The response is untrusted input like any other. A code that does not match the
// pattern would produce a link nobody can join, so it fails here rather than later.
const CreatedMeetingSchema = z.object({
  code: z.string().refine(isValidRoomCode, 'Malformed room code'),
});

type CreateState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'ready'; code: string; chatKey: string }
  | { status: 'failed' };

const CREATE_FAILED = 'Could not start a meeting. Please try again.';

/**
 * Owns creating a meeting and, once created, hands off to the share panel.
 *
 * The chat key is generated and exported here, in the browser, and is never sent
 * anywhere: the request body is empty and the response carries only a code. It
 * lives in this component's own state — a Client Component's state is not
 * serialized to the server, which is what `library-docs.md` → Web Crypto requires.
 */
export function StartMeeting() {
  const [state, setState] = useState<CreateState>({ status: 'idle' });

  async function startMeeting() {
    setState({ status: 'creating' });

    try {
      // The key first. A meeting created without one would be a room whose chat
      // nobody can read, and there is no way to attach a key afterwards.
      const chatKey = await exportChatKey(await generateChatKey());

      const response = await fetch('/api/meetings', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`/api/meetings responded ${response.status}`);
      }

      const { code } = CreatedMeetingSchema.parse(await response.json());
      setState({ status: 'ready', code, chatKey });
    } catch (error) {
      console.error('[start-meeting] could not create a meeting', error);
      setState({ status: 'failed' });
    }
  }

  if (state.status === 'ready') {
    return <SharePanel code={state.code} chatKey={state.chatKey} />;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" onClick={startMeeting} disabled={state.status === 'creating'}>
        {state.status === 'creating' ? 'STARTING' : 'START A MEETING'}
      </Button>

      {state.status === 'failed' ? (
        // Not red: signal is the Leave control and your own muted state.
        <p role="alert" className="text-ink-2 text-xs leading-normal">
          {CREATE_FAILED}
        </p>
      ) : null}
    </div>
  );
}
