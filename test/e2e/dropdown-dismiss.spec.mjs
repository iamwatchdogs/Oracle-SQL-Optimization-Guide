import { expect, test } from '@playwright/test';
import {
  EVIDENCE_KEY,
  READING_PREFS,
  SHIPPED_DISCLOSURES,
  SITE_NAV,
  measureDisclosure,
} from './support/disclosure.mjs';
import { waitForDisclosureClosed, waitForDisclosureOpen } from './support/disclosure-settle.mjs';

const DESKTOP = { width: 1280, height: 900 };
const READING_ROUTE = '/00-preface/02-how-to-prove-a-win/';

/*
 * A point on the page background: outside the shell, so outside every panel, and
 * far enough below the running head that the press cannot land on a header
 * control. A locator would be better if there were anything safe to click, but the
 * only things on a reading page are the article's own links, and a test that
 * follows a link is not a test about dismissal.
 */
const BACKGROUND = { x: 20, y: 700 };

/**
 * Asserts the press point really is outside both panels before using it, so a
 * layout change that moves a panel over the margin fails as "this test's own
 * premise broke" rather than as a mysterious pass.
 */
const assertOutsideBothPanels = (page) =>
  page.evaluate(
    ({ point, selectors }) => {
      const element = document.elementFromPoint(point.x, point.y);
      return selectors.some((selector) => element?.closest?.(selector));
    },
    { point: BACKGROUND, selectors: [SITE_NAV, READING_PREFS] },
  );

const openDropdown = async (page, selector) => {
  await page.click(`${selector} > summary`);
  await waitForDisclosureOpen(page.locator(selector));
};

/*
 * Focus is moved by focusing elements directly, never by pressing Tab.
 *
 * Playwright's WebKit does not implement keyboard tab navigation: `page.keyboard
 * .press('Tab')` leaves the active element exactly where it was, ten times in a
 * row. Every focus rule here would then be measured as "nothing happened" in one of
 * the three engines, and a focus test that passes because focus never moved is
 * worse than no test. `.focus()` produces a real `focusout` with a real
 * `relatedTarget` in all three, which is the event the rules actually read.
 */
const focusInside = (page, selector) =>
  page.locator(`${selector} [data-reading-pref]`).first().focus();

const focusOutside = (page, selector) => page.locator(selector).focus();

const pressOutside = async (page) => {
  await page.mouse.click(BACKGROUND.x, BACKGROUND.y);
};

/**
 * The decisive assertion for the whole feature: that the dismissal went through the
 * shared animated close rather than setting `open = false` directly.
 *
 * `data-disclosure-closing` while `open` is still true is the controller's
 * signature — the row is mid-fold and `open` has not been flipped yet. A dismissal
 * that set `open = false` would set neither, and the panel would have skipped both
 * the 280ms collapse and the padding release that the summary-click close gets.
 *
 * Observed rather than sampled, because sampling it is a race: the attribute is
 * present for 280ms and then gone, and which side of that window a `page.evaluate`
 * round-trip lands on is up to the engine and the machine. Firefox misses it often
 * enough to be a flake. A MutationObserver installed before the press records the
 * whole window, so the assertion is about what happened rather than about when
 * anybody looked.
 */
const watchForAnimatedClose = (page, selector) =>
  page.evaluate((target) => {
    const details = document.querySelector(target);
    globalThis.closeTrail = { animated: false, closedNatively: false, wasOpen: false };
    new MutationObserver(() => {
      const closing = Object.hasOwn(details.dataset, 'disclosureClosing');
      const open = details.hasAttribute('open');
      globalThis.closeTrail.wasOpen = globalThis.closeTrail.wasOpen || open;
      if (closing) {
        globalThis.closeTrail.animated = true;
      }
      /* `open` gone with the closing flag never seen is the native close. */
      if (!open && !globalThis.closeTrail.animated) {
        globalThis.closeTrail.closedNatively = true;
      }
    }).observe(details, {
      attributeFilter: ['data-disclosure-closing', 'open'],
      attributes: true,
    });
  }, selector);

const expectAnimatedClose = async (page) => {
  const seen = await page.evaluate(() => globalThis.closeTrail);
  expect(seen.animated, 'the panel never passed through the animated close').toBe(true);
  expect(seen.wasOpen, 'the panel was never observed open during the close').toBe(true);
  expect(seen.closedNatively, 'the panel closed natively instead of animating').toBe(false);
};

const outsidePressClosesThePreferences = async ({ page }) => {
  expect(await assertOutsideBothPanels(page)).toBe(false);

  await openDropdown(page, READING_PREFS);
  expect((await measureDisclosure(page.locator(READING_PREFS))).open).toBe(true);
  await watchForAnimatedClose(page, READING_PREFS);

  await watchForAnimatedClose(page, READING_PREFS);
  await pressOutside(page);
  await expectAnimatedClose(page);
  await waitForDisclosureClosed(page.locator(READING_PREFS));
};

const outsidePressClosesTheSectionList = async ({ page }) => {
  await openDropdown(page, SITE_NAV);
  await watchForAnimatedClose(page, SITE_NAV);
  await pressOutside(page);
  await expectAnimatedClose(page);
  await waitForDisclosureClosed(page.locator(SITE_NAV));
};

const pressInsideThePanelLeavesItOpen = async ({ page }) => {
  /* Choosing a preference is the whole point of the panel: if a press on one of its
     own controls dismissed it, the second choice would be impossible. Two existing
     reading-preference tests choose twice in a row without reopening, and they are
     the reason this is a test rather than a comment. */
  await openDropdown(page, READING_PREFS);
  await page.click('[data-reading-pref="measure"][data-value="60"]');
  await page.click('[data-reading-pref="measure"][data-value="75"]');
  await expect(page.locator(READING_PREFS)).toHaveAttribute('open', '');
  await expect(page.locator('[data-reading-pref="measure"][data-value="75"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
};

const focusMovingWithinThePanelIsNotLeavingIt = async ({ page }) => {
  await openDropdown(page, READING_PREFS);
  /* From the summary into the first stepper: a real `focusout` on the summary with a
     `relatedTarget` inside the same panel. Closing on this is the bug that makes the
     controls unreachable for a keyboard reader. */
  await focusInside(page, READING_PREFS);
  const state = await measureDisclosure(page.locator(READING_PREFS));
  expect(state.open).toBe(true);
  expect(state.closing).toBe(false);
};

const focusLeavingThePanelClosesIt = async ({ page }) => {
  await openDropdown(page, READING_PREFS);
  await focusInside(page, READING_PREFS);
  /* Onto a real control outside the panel, so the `focusout` names a destination
     rather than going nowhere. */
  await focusOutside(page, `${SITE_NAV} > summary`);
  await waitForDisclosureClosed(page.locator(READING_PREFS));
};

const escapeClosesAndHandsFocusBack = async ({ page }) => {
  await openDropdown(page, READING_PREFS);
  await focusInside(page, READING_PREFS);
  await page.keyboard.press('Escape');
  await waitForDisclosureClosed(page.locator(READING_PREFS));

  /*
   * Without the hand-back, Escape would leave focus on a node that is being removed
   * from the accessibility tree, and the reader's next Tab would start from the top
   * of the document — on a 40-link page that is a whole viewport of controls,
   * re-traversed.
   */
  const onTrigger = await page.evaluate(
    (selector) => document.activeElement?.matches?.(`${selector} > summary`) === true,
    READING_PREFS,
  );
  expect(onTrigger).toBe(true);
};

const nonDropdownDisclosuresDoNotDismiss = async ({ page }) => {
  /*
   * The evidence key is read in place, and a mobile outline that closed when focus
   * left it would close on every link inside it. Both ship `<details>`, both use the
   * same `.disclosure-flow`, and neither carries `data-dropdown`.
   */
  await page.goto('/');
  await page.click(`${EVIDENCE_KEY} > summary`);
  await waitForDisclosureOpen(page.locator(EVIDENCE_KEY));
  await pressOutside(page);
  await page.waitForTimeout(600);
  expect((await measureDisclosure(page.locator(EVIDENCE_KEY))).open).toBe(true);
};

const onlyTheDropdownsAreMarkedDismissible = async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(READING_ROUTE);

  /*
   * The `dropdown` flag in SHIPPED_DISCLOSURES has been a comment until now. This
   * makes it executable: the attribute on the page has to agree with the
   * classification the rest of the suite reasons about, so a fifth `<details>`
   * cannot be added and quietly inherit dismissal — or fail to get it.
   */
  const marked = await page.evaluate(() =>
    [...document.querySelectorAll('details[data-dropdown]')].map((details) => details.id),
  );
  const classified = SHIPPED_DISCLOSURES.filter((entry) => entry.dropdown).map((entry) =>
    entry.selector.split('#').pop(),
  );
  expect(marked.toSorted()).toEqual(classified.toSorted());
};

test.describe('the two header dropdowns dismiss themselves', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(READING_ROUTE);
  });

  test(
    'a press outside the reading preferences closes them, animated',
    outsidePressClosesThePreferences,
  );

  test('a press outside the section list closes it too', outsidePressClosesTheSectionList);

  test('a press on the panel itself leaves it open', pressInsideThePanelLeavesItOpen);

  test(
    'focus moving within the panel is not focus leaving it',
    focusMovingWithinThePanelIsNotLeavingIt,
  );

  test('focus leaving the panel closes it', focusLeavingThePanelClosesIt);

  test('Escape closes it and hands focus back to the trigger', escapeClosesAndHandsFocusBack);

  test(
    'the evidence key is not a dropdown and does not dismiss',
    nonDropdownDisclosuresDoNotDismiss,
  );
});

test('exactly the dropdowns are marked dismissable', onlyTheDropdownsAreMarkedDismissible);
