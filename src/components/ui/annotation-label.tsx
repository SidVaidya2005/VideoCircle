import { cn } from '@/lib/utils';

interface AnnotationLabelProps {
  children: React.ReactNode;
  className?: string;
  /** Pulses the square, for a panel whose subject is genuinely live. */
  live?: boolean;
}

/**
 * The kit's instrument annotation — a dotted identifier and its current state,
 * pinned to a panel: `scope.canvas`, `preview.call`. Written lowercase in the
 * call site per code-standards; the CAPS are this class's, not the copy's.
 *
 * Distinct from `SectionOverline`, which is the *section heading* gesture. Both
 * are a red square followed by wide-tracked CAPS, and they are deliberately not
 * merged: an overline names a band of the page and belongs in the reading order,
 * an annotation labels an instrument and reads as part of it.
 */
export function AnnotationLabel({ children, className, live = false }: AnnotationLabelProps) {
  return (
    <span
      className={cn(
        'text-muted flex items-center gap-2 text-xs tracking-wider uppercase',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('bg-signal inline-block size-1 shrink-0', live && 'animate-live-dot')}
      />
      {children}
    </span>
  );
}
