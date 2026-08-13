import { notFound } from 'next/navigation';

import { RoomExperience } from '@/components/room/room-experience';
import { findMeetingByCode } from '@/lib/meetings';
import { isValidRoomCode } from '@/lib/room-code';
import { createClient } from '@/lib/supabase/server';

/**
 * The signed-in user's name, for prefilling the lobby's display-name field.
 *
 * Read here rather than in the browser so the field is already correct on first
 * paint — a client fetch would show an empty box and then fill it in, under
 * someone who may have started typing. Comes from `profiles`, never
 * `user_metadata`, which is user-editable and free to drift from what call
 * history shows. Guests get null, which is not an error.
 */
async function resolveProfileName(): Promise<string | null> {
  const supabase = await createClient();

  // getUser(), never getSession(): getUser revalidates against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id) // Explicit scope. RLS enforces the same rule independently.
    .maybeSingle();

  if (error) {
    console.error('[room] profile lookup failed', error);
  }

  // A signed-in user with no profile row still gets a usable lobby; they simply
  // type a name like a guest.
  return data?.display_name ?? null;
}

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

/**
 * The route is deliberately not inside the `(shell)` group: a call surface must
 * never inherit the site header and footer.
 *
 * `RoomExperience` is imported directly rather than through `next/dynamic` with
 * `ssr: false`, which Next does not permit from a Server Component. It is not
 * needed here anyway — the room tree is only reachable from this route, so
 * `livekit-client` lands in this route's chunk and never in Home's.
 */
export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  // Shape first. A code that cannot exist in the table is not worth a query, and
  // a typo'd link is the common way to arrive here.
  if (!isValidRoomCode(code)) {
    notFound();
  }

  // A well-formed code is not proof of a meeting. Checking before the lobby
  // renders means a dead link fails now, rather than after someone has granted
  // camera permission and set themselves up to join something that never existed.
  const meeting = await findMeetingByCode(code);
  if (!meeting) {
    notFound();
  }

  return <RoomExperience code={code} profileName={await resolveProfileName()} />;
}
