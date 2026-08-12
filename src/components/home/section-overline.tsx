import { cn } from '@/lib/utils';

interface SectionOverlineProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wide-tracked CAPS label led by the red square — the kit's section-heading
 * gesture, used on every band of the marketing surface.
 */
export function SectionOverline({ children, className }: SectionOverlineProps) {
  return (
    <p
      className={cn(
        'text-muted flex items-center gap-2 text-xs tracking-wider uppercase',
        className,
      )}
    >
      <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
      {children}
    </p>
  );
}
