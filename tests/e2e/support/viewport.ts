import { expect, type Page } from '@playwright/test';

import { MIN_HIT_AREA, MOBILE } from './media';

/**
 * The two measurements feature 22 applies to every surface, at every width.
 *
 * Ten specs already make these checks at 360px, each in its own hand-rolled block.
 * Those stay where they are — each is its own feature's regression guard, and
 * consolidating them touches every call spec at once, which is work feature 26
 * already owns. This module is the shared definition the *sweep* uses, and the
 * shape is lifted from those blocks rather than reinvented.
 *
 * `MIN_HIT_AREA` and `MOBILE` keep their home in `media.ts`, imported rather than
 * restated: a literal written twice is a literal free to drift.
 */

export interface Viewport {
  /** Appears in the failure message, so it has to say which one this was. */
  name: string;
  width: number;
  height: number;
}

/**
 * The seven widths from the build plan, plus phone landscape.
 *
 * Heights are the real devices' own, not arbitrary: several of these surfaces are
 * `dvh` columns where the height decides whether the control bar has room, so a
 * width paired with the wrong height measures a device nobody holds.
 *
 * Landscape is here rather than in a separate list because rotating a phone is not
 * a special case — it is the same person, mid-call, who has turned their hand.
 */
export const VIEWPORTS: readonly Viewport[] = [
  { name: '360 phone', ...MOBILE },
  { name: '390 phone', width: 390, height: 844 },
  { name: '430 phone', width: 430, height: 932 },
  { name: '768 tablet portrait', width: 768, height: 1024 },
  { name: '1024 tablet landscape', width: 1024, height: 768 },
  { name: '1440 laptop', width: 1440, height: 900 },
  { name: '1920 desktop', width: 1920, height: 1080 },
  { name: '740 phone landscape', width: 740, height: 360 },
];

/**
 * Everything a finger is expected to hit. Broader than the `a, button` some of the
 * older blocks use, because `code-standards.md` says *every* interactive element
 * clears 44px, and the lobby's device pickers are `select` while the chat composer
 * is a `textarea`. Both already carry `min-h-11`, so including them costs nothing
 * and stops a later regression in either from going unmeasured.
 */
const INTERACTIVE = 'a, button, select, input, textarea';

/**
 * The sweep asserts **softly**, and that is deliberate.
 *
 * An ordinary spec should stop at its first failure — it is testing one claim, and
 * everything after the break is noise. A sweep is the opposite: it exists to
 * produce a *list*, and a hard assertion turns thirty-two measurements into one
 * finding per run, so an audit becomes eight rounds of fix-and-rerun with no idea
 * how much is left. Soft assertions still fail the test; they just report all of it.
 *
 * Nothing downstream reads a measurement, so continuing past one is safe.
 */
const softExpect = expect.configure({ soft: true });

/**
 * The objective overflow test, reported as the overshoot in pixels.
 *
 * A boolean tells you a surface is broken; a number tells you by how much, which is
 * usually enough to name the element without opening a browser.
 *
 * Polled rather than read once. A viewport change is not synchronous — fonts
 * re-wrap, `matchMedia` listeners fire, and a panel can swap between a sheet and an
 * inline column — so the first frame after a resize is not the settled layout.
 */
export async function expectNoOverflow(page: Page, label: string): Promise<void> {
  await softExpect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth - root.clientWidth;
        }),
      { message: `${label}: horizontal overflow` },
    )
    .toBeLessThanOrEqual(0);
}

/**
 * Every visible interactive element measured against the 44px floor.
 *
 * `document.querySelectorAll` inside `evaluate`, deliberately, rather than
 * Playwright's role engine: the role engine pierces shadow DOM and finds `next
 * dev`'s own 32px tools badge, which is not our markup and fails every sweep.
 *
 * Polled for a second reason beyond layout settling — `animate-tile-in` scales a
 * freshly mounted tile from `0.96`, so everything inside one measures fractionally
 * small until the animation lands. Measuring once turns that into a flake that
 * looks like a real finding.
 */
export async function expectHitAreas(page: Page, label: string): Promise<void> {
  const measure = () =>
    page.evaluate(
      ([selector, min]: readonly [string, number]) => {
        const visible = [...document.querySelectorAll(selector)]
          .map((element) => ({
            // aria-label first: an icon-only control has no text, and its label is
            // the only thing that identifies it in a failure message.
            name:
              element.getAttribute('aria-label') ??
              element.textContent?.trim().slice(0, 24) ??
              element.tagName.toLowerCase(),
            box: element.getBoundingClientRect(),
          }))
          // Zero width means display:none — a control collapsed into the MORE menu
          // is absent, not undersized.
          .filter(({ box }) => box.width > 0);

        return {
          measured: visible.length,
          undersized: visible
            .filter(({ box }) => box.height < min || box.width < min)
            .map(({ name, box }) => `${name} ${Math.round(box.width)}x${Math.round(box.height)}`),
        };
      },
      [INTERACTIVE, MIN_HIT_AREA] as const,
    );

  // The count is asserted alongside the finding, so this cannot pass vacuously.
  // An empty list is the passing result, which means a selector that matched
  // nothing — a renamed element, a surface that never rendered — reads exactly
  // like a clean sweep. Every surface here has controls; zero is a broken check.
  await softExpect
    .poll(() => measure().then((result) => result.measured), {
      message: `${label}: nothing interactive was measured`,
    })
    .toBeGreaterThan(0);

  await softExpect
    .poll(() => measure().then((result) => result.undersized), {
      message: `${label}: undersized targets`,
    })
    .toEqual([]);
}

/** Both measurements, which is what a surface passing the sweep means. */
export async function expectSweepClean(page: Page, label: string): Promise<void> {
  await expectNoOverflow(page, label);
  await expectHitAreas(page, label);
}
