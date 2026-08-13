import type { MediaFailure } from '@/lib/media/classify-media-error';
import { cn } from '@/lib/utils';

interface MediaStateNoticeProps {
  failure: MediaFailure;
  /** One line instead of a panel — for when the other device is working. */
  compact?: boolean;
  className?: string;
}

/**
 * Copy for each way the devices can fail.
 *
 * None of it names a browser API, an error code, or a provider, and none of it
 * dead-ends: every entry says what to do next. `hint` carries the recovery steps,
 * which are the part people actually need and the part a generic error toast
 * always leaves out.
 */
const NOTICE: Record<MediaFailure, { title: string; body: string; hint: string }> = {
  denied: {
    title: 'Camera and microphone are blocked',
    body: 'Your browser is holding on to that choice, so nothing on this page can reach them until it changes.',
    hint: 'On a computer, open the padlock or camera icon in the address bar, set Camera and Microphone to Allow, then reload. On iPhone or iPad, open Settings, then Safari, then Camera and Microphone.',
  },
  'no-device': {
    title: 'No camera or microphone found',
    body: 'Nothing is connected that the browser can see. You can still take part — you just will not be seen or heard.',
    hint: 'If something is plugged in, check it is not switched off in your system settings, then reload.',
  },
  'in-use': {
    title: 'Another app is using your camera',
    body: 'Only one application can hold a camera or microphone at a time.',
    hint: 'Close the other call or recording window, then reload this page.',
  },
  timeout: {
    title: 'Your camera or microphone did not respond',
    body: 'The request was made but nothing came back, which usually means a driver or another app is holding it open.',
    hint: 'Reload the page. If it happens again, close any other app that uses the device, or unplug and reconnect it.',
  },
  error: {
    title: 'Could not start your camera or microphone',
    body: 'Something stopped the browser from reaching them.',
    hint: 'Reload the page. If it keeps happening, try a different browser.',
  },
};

export function MediaStateNotice({ failure, compact = false, className }: MediaStateNoticeProps) {
  const notice = NOTICE[failure];

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
