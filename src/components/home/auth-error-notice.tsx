import { SectionOverline } from '@/components/ui/section-overline';

/**
 * Shown when `/auth/callback` could not complete the exchange and sent the user
 * back to Home with `?error=auth`.
 *
 * Styled as an ordinary card, not an alarm. `signal` red belongs to the Leave
 * control and your own muted state; the only red here is the overline's standard
 * square, which is the kit's section-heading gesture on every band of this page and
 * not a status colour. A failed sign-in is recoverable — you are simply still a
 * guest, which every surface already supports.
 *
 * Carries no error code and names no provider, per code-standards.md → Error Handling.
 */
export function AuthErrorNotice() {
  return (
    <div className="px-4 pt-6 sm:px-6">
      <div
        role="status"
        className="border-line/60 bg-card mx-auto flex max-w-5xl flex-col gap-2 rounded-lg border p-4"
      >
        <SectionOverline>Sign-in did not complete</SectionOverline>
        <p className="text-ink-2 text-sm leading-normal">
          Nothing was saved and you can try again from the header. You can still start or join a
          meeting as a guest.
        </p>
      </div>
    </div>
  );
}
