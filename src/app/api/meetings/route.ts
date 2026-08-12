import { apiError, apiOk } from '@/lib/api';
import { generateRoomCode } from '@/lib/room-code';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Postgres unique-violation. On this table the only unique column is `code`. */
const UNIQUE_VIOLATION = '23505';

/**
 * One retry, not a loop. A real collision needs ~33M meetings at 50 bits of
 * entropy, so a second failure is a bug — a broken generator, a constraint that is
 * not what we think it is — and looping would hide it behind a hung request.
 */
const MAX_ATTEMPTS = 2;

/**
 * Creates a meeting and returns its code.
 *
 * **The server is the only generator, and the browser uses what it is given.** If
 * the client generated the code and we regenerated on collision, the client would
 * navigate to a room it does not own — a bug that appears only on a collision, and
 * so would not appear until it mattered.
 *
 * There is no request body to validate: the endpoint takes no input. The chat key
 * is generated in the browser and stays there; nothing about it reaches this
 * handler, which is why the response carries only a code.
 *
 * `expires_at` is deliberately absent from the insert. The 24-hour window is
 * declared once, as the column default in the migration, and read from there by
 * `/api/token` and the nightly sweep.
 */
export async function POST() {
  try {
    // A null user is a guest, which is the normal case here, not an error.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const code = generateRoomCode();

      const { error } = await supabaseAdmin
        .from('meetings')
        .insert({ code, created_by: user?.id ?? null });

      if (!error) {
        return apiOk({ code }, 201);
      }

      if (error.code !== UNIQUE_VIOLATION) {
        // Anything else is a real failure — surface it to the catch below rather
        // than burning the remaining attempt on a problem retrying cannot fix.
        throw error;
      }

      console.warn('[api/meetings] room code collision on attempt', attempt);
    }

    console.error('[api/meetings] code collision twice — the generator is suspect');
    return apiError('code_collision', 'Could not start a meeting. Please try again.', 409);
  } catch (error) {
    console.error('[api/meetings] failed to create meeting', error);
    return apiError('create_failed', 'Could not start a meeting. Please try again.', 500);
  }
}
