/*
 * Critical CSS, as a browser experiences it.
 *
 * `render-blocking-css.test.mjs` proves the global sheet is inlined into every page's
 * head, by reading the built markup. That is the right level for a fact about a file on
 * disk, and it cannot say the thing that actually matters: whether a reader sees a
 * styled page or an unstyled one while the stylesheet is still in flight. This is the
 * level that can.
 *
 * The method is deliberately not a timing measurement. Nothing here waits for network
 * idle, asserts a byte count, or races a paint against a deadline — a spec that does
 * any of those reports on the machine it ran on rather than on the site, which is a
 * test that fails in CI and passes on a laptop.
 *
 * Instead: ABORT every stylesheet request, then assert the page is completely styled.
 * If the global sheet were still an external `<link>`, blocking all CSS leaves a
 * genuinely unstyled document — white paper, UA serif, no layout — and every
 * computed-style assertion below fails. If it is inline, nothing is missing and the page
 * is complete the moment the head is parsed.
 *
 * That is a stronger claim than "it got fast", and it cannot flake. An inline `<style>`
 * is applied while the head parses, so there is no window in which the page is briefly
 * unstyled and therefore no deadline for this to race. The only failure it can produce
 * is a site that cannot be styled at all without the network, which is a real and
 * severe failure and the one a cold reader on a train hits first.
 *
 * `DOMContentLoaded` is the moment asserted against, chosen rather than `load`. DCL
 * fires after the document has been parsed, so every inline `<style>` has already been
 * applied and the failed stylesheet request has already been abandoned. Waiting for
 * `load` would additionally wait on fonts and on the code-block renderer's sheet —
 * neither of which this assertion is about, and one of which is a known open defect.
 *
 * The code-block renderer (expressive-code) still emits its own stylesheet link into
 * the body. This spec does not claim otherwise about it; `render-blocking-css.test.mjs`
 * pins that remainder in two scoped tests. Everything asserted here is scoped to the
 * global sheet, so refusing all CSS cannot produce a false failure on a code frame.
 */
import { expect, test } from '@playwright/test';
import { FIRST_PAGE } from './support/pages.mjs';
import { DESKTOP, MOBILE } from './support/viewports.mjs';

/** The two cold loads worth guarding: an interior chapter, and the door. */
const ROUTES = ['/', FIRST_PAGE];

/** `#0c0c0e` as a browser reports it. Compared against the page, never asserted as a literal. */
const toRgb = (hex) =>
  `rgb(${hex
    .slice(1)
    .match(/.{2}/gu)
    .map((pair) => Number.parseInt(pair, 16))
    .join(', ')})`;

/**
 * Refuse every stylesheet request the page makes, and report what was refused.
 *
 * The glob matches on the URL, so it covers the hashed `_astro` assets whatever the
 * deployment prefix is — no `deployed()` needed here, and no way for a prefix change to
 * quietly turn this into a spec that blocks nothing and passes vacuously.
 */
const refuseStylesheets = async (page) => {
  const refused = [];
  await page.route('**/*.css', (route) => {
    refused.push(new URL(route.request().url()).pathname);
    return route.abort();
  });
  return refused;
};

/**
 * What the global sheet alone has to be able to produce.
 *
 * Four facts, checked at four different levels, so a partial failure names which part of
 * the sheet went missing rather than reporting "the page was unstyled":
 *
 *   - `--paper` resolving to a hex value proves the theme custom properties arrived.
 *     Nothing else on the page declares them.
 *   - `background-color` equal to that same value proves the `html`/`body` rules
 *     consuming it arrived AND applied — the paint, not the declaration. This is the
 *     "renders with the expected background" check, expressed as an agreement between
 *     two halves of the same sheet rather than as a literal hex value, so a theme change
 *     does not turn it red.
 *   - A monospace face on `.running-head` proves a Tailwind `@utility` rule arrived.
 *     The marker is `ui-monospace` rather than the family name because the font
 *     provider rewrites the family with a content hash on every font bump.
 *   - `display: grid` on `.disclosure-flow` proves a second, unrelated authored rule
 *     arrived, so the sheet is whole rather than partially inlined. `display` rather
 *     than the transition, because `transitionProperty` is one a reader's
 *     `prefers-reduced-motion` setting could legitimately alter.
 *
 * `fontFamily` and `display` are computed values rather than rendered metrics, so none of
 * this waits on a webfont: a `font-display: swap` face that has not loaded still
 * computes to the declared family list. That is what keeps it deterministic.
 */
const readGlobalSheetFacts = (page) =>
  page.evaluate(() => {
    const runningHead = document.querySelector('.running-head');
    const disclosure = document.querySelector('.disclosure-flow');

    return {
      paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
      pageBackground: getComputedStyle(document.body).backgroundColor,
      runningHeadFamily: runningHead === null ? null : getComputedStyle(runningHead).fontFamily,
      disclosureDisplay: disclosure === null ? null : getComputedStyle(disclosure).display,
    };
  });

const headLinksNothing = async ({ page }) => {
  for (const route of ROUTES) {
    for (const viewport of [DESKTOP, MOBILE]) {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      /*
       * `document.head`, not the document. expressive-code writes a stylesheet link
       * into the body on a page with a code block, and that link is a known open
       * defect with its own fix — asserting zero stylesheet links anywhere would be
       * asserting a fix this commit did not make, and would go red for a reason that
       * has nothing to do with the head.
       */
      const linked = await page.evaluate(() =>
        [...document.head.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
      );

      expect(linked, `${route} at ${viewport.width}px links CSS from its head`).toEqual([]);
    }
  }
};

const completeWithoutNetwork = async ({ page }) => {
  const refused = await refuseStylesheets(page);

  /*
   * No network idle, no settle helper, no timeout. The claim is that a reader never
   * needed the network to see a styled page, and waiting would be waiting for the
   * very thing this asserts is unnecessary.
   */
  await page.goto(FIRST_PAGE, { waitUntil: 'domcontentloaded' });

  const facts = await readGlobalSheetFacts(page);

  /* The theme's paper is a hex value, and the body is painted with it. */
  expect(facts.paper, '--paper did not resolve, so no inline sheet applied').toMatch(
    /^#[\da-f]{6}$/iu,
  );
  expect(
    facts.pageBackground,
    'the body is not painted with --paper, so the inline sheet is not in effect',
  ).toBe(toRgb(facts.paper));

  /* Two rules from two different layers of the sheet, not one lucky declaration. */
  expect(facts.runningHeadFamily, 'the .running-head utility did not apply').toContain(
    'ui-monospace',
  );
  expect(facts.disclosureDisplay, '.disclosure-flow did not apply').toBe('grid');

  /*
   * And the request log agrees with the rendering. Whatever CSS was refused here
   * cannot have been what styled the page — which is the whole claim of this spec,
   * stated once more as a count rather than as prose. Without it the test would pass
   * just as well if the route handler were never installed.
   */
  expect(
    refused.length,
    'the spec proved nothing: no stylesheet was ever requested',
  ).toBeGreaterThan(0);
};

const sameWithAndWithout = async ({ page }) => {
  const styled = async (refuse) => {
    if (refuse) {
      await refuseStylesheets(page);
    }
    await page.goto(FIRST_PAGE, { waitUntil: 'domcontentloaded' });
    return readGlobalSheetFacts(page);
  };

  const [withNetwork, withoutNetwork] = [await styled(false), await styled(true)];

  /*
   * Not a snapshot: the same four facts, compared against each other. A future theme
   * change moves both sides together and this stays green, while a sheet that stops
   * arriving inline drops one side and goes red. That is the property a snapshot does
   * not have — a snapshot goes stale on every content edit and fails for changes that
   * are not defects.
   */
  expect(withoutNetwork).toEqual(withNetwork);
};

test.describe('cold load — the global sheet is not fetched', () => {
  test('the head links no stylesheet, on any page, at any width', headLinksNothing);

  test('the page is complete with every stylesheet request refused', completeWithoutNetwork);

  test('the same page styles identically with and without the network', sameWithAndWithout);
});
