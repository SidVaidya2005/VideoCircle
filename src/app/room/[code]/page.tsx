import { notFound } from 'next/navigation';

import { RoomExperience } from '@/components/room/room-experience';
import { findMeetingByCode } from '@/lib/meetings';
import { isValidRoomCode } from '@/lib/room-code';

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

  return <RoomExperience code={code} />;
}
