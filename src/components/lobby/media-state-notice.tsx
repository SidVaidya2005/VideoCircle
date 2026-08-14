import type { MediaFailure } from '@/lib/media/classify-media-error';
import { MEDIA_FAILURE_COPY } from '@/lib/media/media-failure-copy';
import { cn } from '@/lib/utils';

interface MediaStateNoticeProps {
  failure: MediaFailure;
  /** One line instead of a panel — for when the other device is working. */
  compact?: boolean;
  className?: string;
}

export function MediaStateNotice({ failure, compact = false, className }: MediaStateNoticeProps) {
  const notice = MEDIA_FAILURE_COPY[failure];

  if (compact) {
    return (
      <p role="status" className={cn('text-ink-2 text-xs leading-normal', className)}>
        <span className="text-ink">{notice.title}.</span> {notice.hint}
      </p>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'border-line/60 bg-card flex flex-col gap-2 rounded-lg border p-5 text-left',
        className,
      )}
    >
      <p className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
        <span aria-hidden="true" className="bg-signal inline-block size-1 shrink-0" />
        {notice.title}
      </p>
      <p className="text-ink-2 text-sm leading-normal">{notice.body}</p>
      <p className="text-faint text-xs leading-normal">{notice.hint}</p>
    </div>
  );
}
