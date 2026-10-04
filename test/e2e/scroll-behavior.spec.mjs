import { expect, test } from '@playwright/test';
import { ARTICLE, DESKTOP_VIEWPORT } from './support/toc.mjs';

/**
 * In-page navigation lands INSTANTLY.
 *
 * The stylesheet half of this is `test/integration/scroll-behavior.test.mjs`: it
 * proves the compiled sheet asks for no smooth scrolling. This file is the half a
 * Node test cannot reach — what the layout engine actually does when a link in the
 * reading outline is clicked.
 *
 * WHY THE LANDING IS ASSERTED WITHOUT A WAIT. `:target, [id] { scroll-margin-top:
 * 5.5rem }` means an anchor jump is ONE synchronous scroll: by the time the click's
 * own task returns, the offset is already correct. `scroll-behavior: smooth` on the
 * root replaced that with a browser-driven animation of an unpredictable length,
 * every frame of which the scroll-spy measured all headings against — so a spec for
 * this surface has to choose between a short budget that a smooth scroll cannot
 * meet and a generous one that hides the difference. `INSTANT_LANDING_BUDGET_MS` is
 * the short one, and there is deliberately no `waitForTimeout` or `waitForFunction`
 * anywhere below: waiting is the thing being asserted against.
 */

/** The outline links in the desktop rail; the mobile list needs a disclosure opened. */
const RAIL_LINK = 'aside.toc-viewport [data-toc-link]';

/**
 * How long an instant jump is allowed to take, and why the number is small.
 *
 * Chromium drives a multi-thousand-pixel smooth scroll for hundreds of
 * milliseconds — the third entry of this page's outline sits far enough down that
 * the animation is plainly still in flight a quarter of the way through. An instant
 * jump needs one rendering opportunity. So this budget separates the two worlds
 * with room to spare on the side that has to pass, rather than sitting near the
 * boundary where an engine's animation timing decides the result.
 */
const INSTANT_LANDING_BUDGET_MS = 250;

/**
 * Where the document should come to rest for a fragment navigation to `target`.
 *
 * Read rather than hardcoded, because `scroll-margin-top` is what makes a heading
 * land clear of the 48px sticky header and 5.5rem is only its value TODAY. The
 * absolute document offset (`rect.top + scrollY`) is used rather than
 * `offsetTop`, so the answer does not depend on where the reader is when it is
 * measured — Playwright scrolls the sticky rail into view before clicking it, and
 * that can move the document.
 */
const restingOffsetFor = (page, id) =>
  page.evaluate((target) => {
    /*
     * Markdown slugs often begin with a digit, so the id has to be escaped before
     * it can be used as a selector. `CSS` is a browser global, not a Node one, so
     * this runs in the page — which is also the only place the measurement can be
     * taken from live layout.
     */
    const heading = document.querySelector('#' + CSS.escape(target));
    if (!heading) {
      return null;
    }
    const margin = Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
    return heading.getBoundingClientRect().top + window.scrollY - margin;
  }, id);

/**
 * How far the document is from where the fragment navigation should have left it.
 *
 * Returned as a DISTANCE rather than as the offset itself, for two reasons. The
 * reported failure is then the number of pixels still to travel, which names the
 * regression directly; and a one-pixel tolerance absorbs the subpixel snapping a
 * browser may apply to an otherwise exact landing, so the test cannot go red on
 * rounding. It would still go red on an animation, which is the point.
 */
const distanceFromRestingOffset = async (page, expected) => {
  const reached = await page.evaluate(() => window.scrollY);
  return Math.abs(reached - expected);
};

test.describe('in-page navigation', () => {
  /*
   * The rail is `hidden lg:block`, so on the mobile-chromium project it is not in
   * the layout at the device viewport and every locator here would resolve to
   * nothing. Forcing the desktop viewport per-describe is what
   * `reading-toc.spec.mjs` does for the same reason.
   */
  test.use({ viewport: DESKTOP_VIEWPORT });

  test('follows an outline anchor without a scroll animation to wait out', async ({ page }) => {
    await page.goto(ARTICLE);

    /*
     * FIRST, the declared value, read off the element that actually scrolls the
     * document. `<ClientRouter />` answers the click with `location.href`, so there
     * is no router-side scroll option to inspect — the root element's computed
     * `scroll-behavior` IS the input to the browser's fragment scroll, and reading
     * it is the assertion that would fail if `smooth` came back by any route.
     */
    const behavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behavior, 'the root scrolling element is set to smooth-scroll').toBe('auto');

    /*
     * THEN the jump. The third entry, not the first: the first heading is close
     * enough to the top that a smooth scroll would finish inside any sane timeout,
     * which would make the rest of the test prove nothing.
     */
    const link = page.locator(RAIL_LINK).nth(2);
    const id = await link.getAttribute('data-toc-link');
    expect(id, 'the reading outline ships no links').toBeTruthy();

    const expected = await restingOffsetFor(page, id);
    expect(expected, `heading #${id} is not in the document`).not.toBeNull();

    await link.click();

    await expect
      .poll(() => distanceFromRestingOffset(page, expected), {
        timeout: INSTANT_LANDING_BUDGET_MS,
        message:
          `the jump to #${id} had not come to rest ${INSTANT_LANDING_BUDGET_MS}ms after the ` +
          'click, which is what an animated scroll looks like — this spec cannot wait one out',
      })
      .toBeLessThanOrEqual(1);
  });
});
