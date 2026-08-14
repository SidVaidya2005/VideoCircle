import Link from 'next/link';

import { HistoryEmpty } from '@/components/history/history-empty';
import { HistoryTime } from '@/components/history/history-time';
import { Button } from '@/components/ui/button';
import { SectionOverline } from '@/components/ui/section-overline';
import { formatDuration, splitParticipantNames, type HistoryEntry } from '@/lib/history';
import { cn } from '@/lib/utils';

interface HistoryListProps {
  entries: HistoryEntry[];
}

/**
 * Shared by the header strip and every entry, so the columns stay aligned.
 *
 * The widths themselves live in `globals.css` as `.history-row`, because they are
 * literals and literals belong in that file — an arbitrary-value utility here is a
 * lint error, and rightly so.
 */
const ROW_GRID = 'history-row sm:grid sm:items-center sm:gap-4';

const COLUMN_LABELS = ['When', 'Duration', 'Code', 'With'] as const;

/**
 * One field of an entry.
 *
 * The label is rendered per cell and hidden above `sm:`, where the header strip
 * takes over. That is what lets one set of markup be a card on a phone and a table
 * row on a laptop without the two layouts drifting apart.
 */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
      <span
        aria-hidden="true"
        className="text-faint shrink-0 text-xs tracking-wider uppercase sm:hidden"
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function DurationCell({ duration }: { duration: HistoryEntry['duration'] }) {
  if (duration.status === 'in-progress') {
    // Not red and not a filled surface: red is reserved for Leave and your own
    // muted mic, and this is a status, not a warning.
    return <span className="text-ink text-xs tracking-wider uppercase">In progress</span>;
  }

  return (
    <span className="text-ink-2 text-sm">
      {duration.status === 'estimated' ? '~' : ''}
      {formatDuration(duration.seconds)}
      {duration.status === 'estimated' ? (
        // The tilde is the entire signal a sighted reader gets; without this the
        // distinction does not exist for a screen reader at all.
        <span className="sr-only"> (estimated — no leave was recorded)</span>
      ) : null}
    </span>
  );
}

function ParticipantsCell({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <span className="text-faint text-sm">No one else joined</span>;
  }

  const { shown, overflow } = splitParticipantNames(names);

  return (
    <span className="text-ink-2 truncate text-sm">
      {shown.join(', ')}
      {overflow > 0 ? <span className="text-faint">{` +${overflow} more`}</span> : null}
    </span>
  );
}

/**
 * Call history: one entry per meeting, newest first.
 *
 * **One list, restyled — not a card tree and a table tree behind breakpoints.**
 * Below `sm:` each entry is a card; above it the same markup becomes an aligned grid
 * row under a header strip. Rendering both and hiding one would duplicate every name
 * and code in the DOM and give the two layouts room to disagree.
 *
 * A `<ul>` rather than a `<table>`, because the phone layout is genuinely a list of
 * cards and a table that reflows to cards needs `display` overrides that destroy the
 * row and cell semantics anyway. Each cell carries its own label instead, so nothing
 * depends on the desktop header strip being announced.
 */
export function HistoryList({ entries }: HistoryListProps) {
  const anyJoinable = entries.some((entry) => entry.joinable);

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <SectionOverline>Call history</SectionOverline>
          <h1 className="max-w-2xl text-xl leading-snug sm:text-2xl">Every meeting you joined</h1>
        </div>

        {entries.length === 0 ? (
          <HistoryEmpty />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Decorative, and desktop-only: every cell below states its own label,
                so announcing these too would read each field name twice. */}
            <div
              aria-hidden="true"
              className={cn('text-faint hidden px-4 text-xs tracking-wider uppercase', ROW_GRID)}
            >
              {COLUMN_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li
                  key={entry.meetingId}
                  className={cn(
                    'bg-card border-line/60 flex flex-col gap-3 rounded-lg border p-4',
                    ROW_GRID,
                  )}
                >
                  <Cell label="When">
                    <HistoryTime at={entry.startedAt} className="text-ink text-sm" />
                  </Cell>

                  <Cell label="Duration">
                    <DurationCell duration={entry.duration} />
                  </Cell>

                  <Cell label="Code">
                    {/* Verbatim and lowercase, like every identifier in this product. */}
                    <span className="text-ink-2 text-sm">{entry.code}</span>
                  </Cell>

                  <Cell label="With">
                    <ParticipantsCell names={entry.otherNames} />
                  </Cell>

                  {entry.joinable ? (
                    <Button asChild size="sm" variant="secondary">
                      {/* No fragment, so this call has no chat key — see the note below. */}
                      <Link href={`/room/${entry.code}`}>Rejoin</Link>
                    </Button>
                  ) : (
                    // Holds the column so rows stay aligned above `sm:`.
                    <span aria-hidden="true" className="hidden sm:block" />
                  )}
                </li>
              ))}
            </ul>

            {anyJoinable ? (
              <p className="text-faint max-w-2xl text-xs leading-normal">
                Rejoining opens the meeting without its encryption key, so chat will be unreadable.
                The key lives only in the original link — open that instead if you still have it.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
