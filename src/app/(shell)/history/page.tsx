import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HistoryList } from '@/components/history/history-list';
import { buildHistoryEntries, type OtherParticipation, type OwnParticipation } from '@/lib/history';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Call History',
};

/** The canonical page size from `code-standards.md`. There is no pagination. */
const MAX_ENTRIES = 50;

/**
 * The meetings the signed-in user took part in.
 *
 * Two queries rather than one nested embed: the second fetches every participation
 * row in those meetings so co-participant names can be read off it. Embedding
 * `meeting_participants` twice through `meetings` would work, but it buries the
 * grouping in a query shape no unit test can reach — and the grouping is where the
 * decisions live.
 *
 * The session client throughout, never `supabaseAdmin`. The
 * `read participation in meetings you joined` policy admits exactly these rows, so
 * RLS enforces the scope a second time underneath the explicit `.eq()`. This is the
 * one surface in the product where that holds: guests have no session, which is why
 * every other read goes through the admin client.
 */
export default async function HistoryPage() {
  const supabase = await createClient();

  // getUser(), never getSession(): getUser revalidates against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: own, error: ownError } = await supabase
    .from('meeting_participants')
    .select('identity, display_name, joined_at, left_at, meetings(id, code, ended_at, expires_at)')
    .eq('user_id', user.id) // Explicit scope. RLS enforces the same rule independently.
    .order('joined_at', { ascending: false })
    .limit(MAX_ENTRIES);

  if (ownError) {
    // Logged and rendered as empty. A failed query must not take the page down —
    // the person still needs the header, the footer, and a way out.
    console.error('[history] participation query failed', ownError);
    return <HistoryList entries={[]} />;
  }

  // `meetings` comes back nullable because the embed is typed as an outer join; a
  // participation row cannot exist without one (the FK is `not null`), so a null
  // here would be a broken row rather than a meeting that ended.
  const ownRows: OwnParticipation[] = (own ?? []).flatMap((row) =>
    row.meetings
      ? [
          {
            identity: row.identity,
            displayName: row.display_name,
            joinedAt: row.joined_at,
            leftAt: row.left_at,
            meeting: {
              id: row.meetings.id,
              code: row.meetings.code,
              endedAt: row.meetings.ended_at,
              expiresAt: row.meetings.expires_at,
            },
          },
        ]
      : [],
  );

  const meetingIds = [...new Set(ownRows.map((row) => row.meeting.id))];

  let otherRows: OtherParticipation[] = [];
  if (meetingIds.length > 0) {
    const { data: others, error: othersError } = await supabase
      .from('meeting_participants')
      .select('identity, display_name, joined_at, left_at, meeting_id')
      .in('meeting_id', meetingIds);

    if (othersError) {
      // Degrade, do not fail: the meetings are worth showing without the names.
      console.error('[history] co-participant query failed', othersError);
    }

    otherRows = (others ?? []).map((row) => ({
      identity: row.identity,
      displayName: row.display_name,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      meetingId: row.meeting_id,
    }));
  }

  const entries = buildHistoryEntries({ ownRows, otherRows, now: new Date() });

  return <HistoryList entries={entries} />;
}
