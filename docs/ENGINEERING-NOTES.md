# Engineering notes

Bugs from building VideoCircle that were worth more than the fix. Each was found by
measurement rather than reasoning, and several were the opposite of what the
convention would predict.

The full record, feature by feature, is in `context/build-journal.md` and
`context/constraints.md`.

## A route-level `loading.tsx` broke two HTTP status codes

Next flushes a loading shell immediately, which sends the HTTP status before the
route's own gate runs. So `notFound()` afterwards can only swap the UI, and
`redirect()` degrades to a client-side navigation.

Adding the conventional skeleton to two routes took a dead meeting link from **404 to
200**, and signed-out `/history` from a **307 to a 200 that rendered the page's own
heading** to someone not allowed to see it — stranding a visitor without JavaScript on
a skeleton forever. Two existing tests caught the first. Nothing caught the second:
the auth end-to-end test passed, because the client-side redirect does eventually
happen.

**A skeleton is only safe on a route whose server work is pure fetching, never one
that gates.** There is deliberately no `loading.tsx` anywhere in this project.

## `suppressHydrationWarning` hid a timezone bug rather than fixing it

A server-rendered `Intl` call formats in the server's zone — UTC on Render — so call
history showed every reader the wrong time. The escape hatch suppresses the warning
by _keeping the server's output_, so it hid the bug instead of fixing it, and stopped
React re-rendering at all.

The working shape is a hydration flag through `useSyncExternalStore`, the same
primitive `use-media-query` uses for the same reason.

**Any value only the reader's environment knows needs a real client re-render, not a
silenced warning.**

## A test gate that could never fail hid two "flakes"

`page.getByText('Connected')` defaults to a case-insensitive **substring** match, and
the call status strip's first state is `Disconnected` — which contains it. So every
wait for a connected room resolved instantly, against a room that had not connected.

What that produced downstream was misread as product flakiness for months.
`reactions.spec.ts` raised a hand 2.7s before the signal was up, where livekit-client
refuses the write outright: **7 failures in 40 at one worker, 24 in 40 at four**.
`connection.spec.ts` went offline against a room that had never connected, so no
reconnect banner could appear. Neither was a race, a timeout margin, or a LiveKit
problem. With `exact: true` behind one shared locator: **0 in 40**, and 40 of 40 on
the banner.

**A suite's preconditions deserve the same "seen to fail" proof its assertions get.**
An assertion that never runs is invisible; a wrong one at least goes red.

## The lobby leaked a live microphone into the call

The mount acquisition effect guarded on a `cancelled` flag, which is set only by the
effect's own cleanup — but pressing Join does not unmount the hook. Abandonment is
signalled by bumping a generation counter, and the mount effect was the one
acquisition path that never read it.

A request still in flight at Join therefore resolved as not-cancelled and was never
stopped: the device stayed open for the whole call, under a control reading muted. No
audio reached the room, because the track is never published — but on a real device
the OS microphone indicator stays lit, which this project forbids. Measured on a
production build at **2 live audio tracks in 6 of 6 runs before, 1 in 6 of 6 after**.

**Two guards for the same condition is one guard too few.** Every acquisition path now
snapshots both counters before its first `await`.

## An exhaustive-looking `switch` that wasn't

The disconnect mapping handled thirteen `DisconnectReason` members because thirteen
was as far as the `sed` window reached. The enum has seventeen, and `typecheck` passed
clean: with `noImplicitReturns` off, the four missing members simply returned
`undefined`, which would have rendered a blank panel to someone whose call had just
dropped. The unit test caught it on its first run.

The same undercount was sitting in the published docs for `ConnectionQuality`, which
list four values and omit `Lost` — the state a recovery feature exists for.

**Installed types are the authority; a docs page is a summary.** An exhaustive
`switch` proves nothing without a `never` guard.

## A responsive audit that measured one axis

Both of the responsive sweep's measurements are horizontal — `scrollWidth >
clientWidth`, and every hit area against 44px. So Home passed at all eight widths
while its primary action sat **entirely below the fold** in phone landscape: viewport
ratio 0 at 740×360, not a near miss. It had been true for as long as the sweep had
been green.

Reading found two more that the sweep never could: `/history` was overflowing by
181px at 768px — `truncate` has no effect on an inline box — and a missing `viewport`
export meant every `env(safe-area-inset-*)` in the project had been resolving to zero
for eighteen features, which a desktop browser reports as correct either way.

**A check cannot fail on an axis it does not look at**, and testing only the 360px
floor cannot see a rule that breaks in the middle.

## Sign-in was testable without the identity provider

The plan assumed a signed-in page was untestable: Playwright cannot drive Google's
consent screen, and the password path would mean enabling a provider we want closed.

`auth.admin.generateLink` plus `verifyOtp` mints a genuine session with no mail sent,
and writing it into the browser in `@supabase/ssr`'s cookie shape signs the context in
for real — `getUser()` still revalidates, and RLS still sees the real `auth.uid()`.
Only the identity provider handshake is skipped.

**Reach for this before conceding coverage on anything behind auth.**

## One question was settled by reading the SDK, not by testing

A muted microphone coming back unmuted after a reconnect looked like a bug worth
defending against, and ~57 accumulated green test runs looked like evidence it was
fixed. Instrumenting the test showed the runs meant nothing: in all 39 that produced
evidence, going offline took the resume / ICE-restart path — zero new peer
connections. A full restart is the only path that could lose mute intent, and it is
unreachable from the test harness, because the error it raises is explicitly excluded
from promoting a reconnect to a full one.

Reading livekit-client end to end found every path it owns preserves mute
deliberately, including reconciling the server to the client's local value on rejoin.
So the reapply-on-reconnect fix was **deliberately not written** — it would have
layered our write onto a correct SDK path mid-flight.

**A test that cannot reach the path it is named for is not evidence.** Sometimes
reading the dependency is the best available proof, and saying so is better than
collecting green runs that were never in a position to fail.
