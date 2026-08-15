import { AnnotationLabel } from '@/components/ui/annotation-label';
import { cn } from '@/lib/utils';

interface CallPreviewProps {
  className?: string;
  /** Tiles stagger in from the centre outwards; each also takes the speaking ring in turn. */
  participants?: readonly { initials: string; name: string; muted?: boolean }[];
}

const DEFAULT_PARTICIPANTS = [
  { initials: 'SV', name: 'Siddarth' },
  { initials: 'AM', name: 'Ana', muted: true },
  { initials: 'JK', name: 'Jonas' },
  { initials: 'RT', name: 'Ravi' },
] as const;

const RING_CYCLE_MS = 6000;

/**
 * A still life of a call — not a call. Everything here is CSS: no LiveKit, no
 * media, no `getUserMedia`. It exists so Home can show what the product is
 * rather than describe it, and it doubles as a sketch of the tile treatment
 * feature 10 builds for real.
 *
 * Deliberately NOT carrying `.grid-backdrop`: the design system bars the grid
 * from anywhere that reads as a video surface, and a mock that breaks the rule
 * teaches the wrong pattern to whoever builds the real grid.
 *
 * The whole thing is one `role="img"` with a written description, so assistive
 * tech gets a sentence instead of a pile of decorative initials.
 */
export function CallPreview({ className, participants = DEFAULT_PARTICIPANTS }: CallPreviewProps) {
  return (
    <div
      role="img"
      aria-label={`A VideoCircle call in progress with ${participants.length} participants, one screen sharing, chat open.`}
      className={cn('bg-card border-line/60 relative overflow-hidden rounded-lg border', className)}
    >
      {/* status strip — pinned top, the kit's fixed-strip layout */}
      <div className="border-line/60 flex items-center justify-between border-b px-3 py-2">
        <AnnotationLabel live>preview.call · live</AnnotationLabel>
        <span className="text-faint text-xs tracking-wide uppercase">00:12:07</span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {participants.map((participant, index) => (
          <div
            key={participant.initials}
            className="bg-raised animate-tile-in relative flex aspect-video items-center justify-center rounded-md"
            style={{
              // Stagger from the centre outwards, then take the speaking ring in
              // turn. Computed per index, so it cannot live in a utility class.
              animationDelay: `${Math.abs(index - (participants.length - 1) / 2) * 90}ms`,
            }}
          >
            <span
              className="animate-speaking-ring absolute inset-0 rounded-md"
              // Offset by index so exactly one tile is ringed at a time — a
              // per-index value, so no utility class can express it.
              style={{ animationDelay: `${(index * RING_CYCLE_MS) / participants.length}ms` }}
            />
            <span className="text-ink-2 text-sm tracking-wide">{participant.initials}</span>

            {/* No scrim here: this label sits on a known --bg-3, so contrast is
                deterministic. The real tiles in feature 10 sit on arbitrary live
                pixels and MUST use --scrim-tile — see preview/video-scrim.html. */}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-md px-2 py-1">
              <span className="text-ink truncate text-xs">{participant.name}</span>
              {participant.muted ? (
                // A remote participant's mute is neutral. Red is reserved for
                // Leave and for your own muted state.
                <span className="text-muted text-xs tracking-wide uppercase">muted</span>
              ) : (
                <span aria-hidden="true" className="flex items-end gap-0.5">
                  {[0, 1, 2].map((bar) => (
                    <span
                      key={bar}
                      className="bg-muted animate-level inline-block h-2 w-0.5 origin-bottom"
                      // Per-bar offset so the three bars ripple rather than pulse
                      // in unison. Computed from the index.
                      style={{ animationDelay: `${bar * 120}ms` }}
                    />
                  ))}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* control bar — pinned bottom. Pictures of controls, not controls: no
          button elements, so nothing here lands in the tab order. */}
      <div className="border-line/60 flex items-center justify-center gap-2 border-t px-3 py-3">
        {['mic', 'cam', 'share', 'chat'].map((control) => (
          <span
            key={control}
            className="bg-raised text-muted rounded-md px-3 py-2 text-xs tracking-wide uppercase"
          >
            {control}
          </span>
        ))}
        <span className="bg-signal text-canvas rounded-md px-3 py-2 text-xs tracking-wide uppercase">
          Leave
        </span>
      </div>
    </div>
  );
}
