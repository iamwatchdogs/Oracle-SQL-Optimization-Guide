import { expect, test } from '@playwright/test';
import {
  EVIDENCE_KEY,
  SHIPPED_DISCLOSURES,
  SITE_NAV,
  SITE_NAV_SUMMARY,
  px,
  summaryMarker,
  summaryStyle,
} from './support/disclosure.mjs';
import { waitForDisclosureSettled } from './support/disclosure-settle.mjs';
import { deployed } from './support/deployed.mjs';

/**
 * Disclosure / accordion.
 *
 * Root cause guarded here: the entire disclosure stylesheet — 130-odd lines
 * covering the frame, the summary hit target, the marker suppression, the
 * open/close colour and the running inner padding — was scoped to
 * `.prose details`. Not one shipped disclosure lives inside `.prose`: the site
 * nav, the evidence key and the mobile table of contents are all siblings of
 * the article body. The component was dead code, and each of the three
 * accordions was instead carried by an ad-hoc Tailwind class string that shared
 * no logic with the others.
 *
 * The stylesheet is now scoped to the `details` element, with `.disclosure` as
 * the opt-in framed variant. These specs assert against the real shipped
 * markup on every route, so re-scoping the CSS back to `.prose` fails here.
 */

/** One test per shipped `<details>`, named after the disclosure and its route. */
function declareShippedDisclosureIsStyledTests() {
  for (const disclosure of SHIPPED_DISCLOSURES) {
    test(`${disclosure.name} on ${disclosure.route} is styled by the disclosure component`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(disclosure.route);
      const details = page.locator(disclosure.selector).first();
      await expect(details).toHaveCount(1);

      const frame = await details.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          borderTop: s.borderTopWidth,
          borderBottom: s.borderBottomWidth,
          borderTopColor: s.borderTopColor,
        };
      });
      /*
       * The framed variant supplies 1px hairlines. The two header dropdowns have
       * none, and not by accident: they are not `.disclosure`, they are panels
       * that draw their OWN border when they are open, and a rule keyed on one
       * element's selector stopped being a statement about dropdowns the moment
       * the second one shipped.
       */
      if (!disclosure.dropdown) {
        expect(px(frame.borderTop)).toBe(1);
        expect(px(frame.borderBottom)).toBe(1);
      }

      const summary = await summaryStyle(page.locator(`${disclosure.selector} > summary`));
      expect(summary.cursor).toBe('pointer');
      expect(summary.listStyleType).toBe('none');
      // 44px minimum hit target on every shipped summary.
      expect(summary.height).toBeGreaterThanOrEqual(44);
      expect(summary.display).toBe('flex');
    });
  }
}

test.describe('shipped disclosures — the component applies to real markup', () => {
  declareShippedDisclosureIsStyledTests();

  test('every summary suppresses the native disclosure marker', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Each disclosure has to be measured on its own route, and every hop is a
    // real navigation of the one `page`, so the probes stay in order and are
    // never run concurrently. The list is walked rather than destructured: the
    // header now ships two disclosures, and a positional destructure silently
    // dropped the fourth the day the reading preferences landed.
    const seen = [];
    for (const disclosure of SHIPPED_DISCLOSURES) {
      seen.push(`${disclosure.name}=${await summaryMarker(page, disclosure)}`);
    }
    expect(seen).toEqual(SHIPPED_DISCLOSURES.map((d) => `${d.name}=none`));
  });

  test('every summary has real inline padding, not a flush hit area', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The evidence key's summary shipped with `padding: 0`, so its 44px hit
    // area began exactly at the glyph's left edge.
    await page.goto('/');
    const style = await summaryStyle(page.locator(`${EVIDENCE_KEY} > summary`));
    expect(px(style.paddingLeft)).toBeGreaterThan(0);
    expect(px(style.paddingRight)).toBeGreaterThan(0);
  });
});

test.describe('shipped disclosures — open and close', () => {
  test('the evidence key toggles and carries the open state', evidenceKeyToggles);

  test(
    'the evidence key opens on a #evidence-key deep link and stays anchored',
    evidenceKeyOpensOnDeepLink,
  );

  test(
    'the evidence key opens on a client-side navigation to the deep link',
    evidenceKeyOpensOnClientSideNavigation,
  );

  test('the site nav opens, closes, and marks the current section', siteNavOpensAndCloses);

  test('the site nav opens and closes from the keyboard', siteNavWorksFromTheKeyboard);

  test('the mobile table of contents opens and lists every heading', mobileTocListsEveryHeading);
});

async function evidenceKeyToggles({ page }) {
  await page.goto('/');
  const details = page.locator(EVIDENCE_KEY);
  await expect(details).not.toHaveAttribute('open', /.*/u);

  await page.locator(`${EVIDENCE_KEY} > summary`).click();
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator(`${EVIDENCE_KEY} .disclosure-content-inner`)).toBeVisible();

  await page.locator(`${EVIDENCE_KEY} > summary`).click();
  await expect(details).not.toHaveAttribute('open', /.*/u);
}

async function evidenceKeyOpensOnDeepLink({ page }) {
  await page.goto('/#evidence-key');
  const details = page.locator(EVIDENCE_KEY);
  await expect(details).toHaveAttribute('open', '');

  /*
   * Poll the ANCHOR itself, not the row's height.
   *
   * `:target, [id] { scroll-margin-top: 5.5rem }` plus a re-anchor after the panel
   * grows, so the key must come to rest clear of the header and below the fold.
   * The row reaching its natural height is not that condition: the re-anchor runs
   * on the frame after, so a `boundingBox()` read gated on the height is still a
   * read from before the jump — which is where a reader is never left, and why this
   * flaked on Chromium and WebKit while always passing in a quiet browser.
   *
   * Polling the asserted property is not a weaker assertion. A missing, late or
   * wrongly aimed re-anchor never satisfies it, so the poll still fails — the
   * message below shows the worst position seen while it waited.
   */
  const headerHeight = await page
    .locator('header')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);

  let worstSeen = Number.NEGATIVE_INFINITY;
  await expect
    .poll(
      async () => {
        const box = await details.boundingBox();
        worstSeen = Math.max(worstSeen, box?.y ?? Number.NEGATIVE_INFINITY);
        return box?.y ?? Number.NEGATIVE_INFINITY;
      },
      {
        timeout: 2000,
        message: () =>
          `the evidence key never settled anchored (best top: ${worstSeen}px, header: ${headerHeight}px)`,
      },
    )
    .toBeGreaterThanOrEqual(headerHeight - 1);

  await waitForDisclosureSettled(details);
}

/**
 * The "Full key" link lives in the *article header* of an interior page, so the
 * walk has to start on one. The home page carries the `#evidence-key` panel but
 * not the link that points at it, which is why a home-page start used to time
 * out on the home page's `#evidence-key` link.
 */
async function evidenceKeyOpensOnClientSideNavigation({ page }) {
  await page.goto('/00-preface/01-why-evidence-grades/');
  const fullKey = page.locator(`main#main a[href="${deployed('/#evidence-key')}"]`).first();
  await expect(fullKey).toBeVisible();

  await fullKey.click();
  // The panel is opened by an `astro:page-load` handler that reads
  // `location.hash`, so the navigation has to be known to have landed before
  // `open` means anything.
  await page.waitForFunction((home) => location.pathname === home, deployed('/'), {
    timeout: 15_000,
  });
  await expect(page.locator(EVIDENCE_KEY)).toHaveAttribute('open', '');
}

async function siteNavOpensAndCloses({ page }) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/01-proven-techniques/01-measure-first/');
  const nav = page.locator(SITE_NAV);
  await expect(nav).not.toHaveAttribute('open', /.*/u);

  await page.locator(SITE_NAV_SUMMARY).click();
  await expect(nav).toHaveAttribute('open', '');
  await expect(
    page.locator('header nav[aria-label="Book sections"] a[aria-current="location"]'),
  ).toHaveCount(1);

  await page.locator(SITE_NAV_SUMMARY).click();
  await expect(nav).not.toHaveAttribute('open', /.*/u);
}

async function siteNavWorksFromTheKeyboard({ page }) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const nav = page.locator(SITE_NAV);
  await page.locator(SITE_NAV_SUMMARY).focus();
  await page.keyboard.press('Enter');
  await expect(nav).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(nav).not.toHaveAttribute('open', /.*/u);
  await page.keyboard.press('Space');
  await expect(nav).toHaveAttribute('open', '');
}

async function mobileTocListsEveryHeading({ page }) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/00-preface/');
  const details = page.locator('[data-toc-mobile]');
  await expect(details).toBeVisible();
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  const expected = await page
    .locator('article.prose h2, article.prose h3, article.prose h4')
    .count();
  await expect(details.locator('[data-toc-link]')).toHaveCount(expected);
}

test.describe('shipped disclosures — spacing rhythm', () => {
  test('the mobile table of contents does not double the grid gap', mobileTocDoesNotDoubleTheGap);
});

async function mobileTocDoesNotDoubleTheGap({ page }) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/00-preface/');
  const gap = await page.locator('[data-toc-mobile]').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const breadcrumb = el.parentElement.parentElement.querySelector('nav[aria-label="Breadcrumb"]');
    return Math.round(breadcrumb.getBoundingClientRect().top - rect.bottom);
  });
  // The disclosure carried `mb-6` inside a `gap-6` grid, so the space below it
  // was 48px against a 16px rhythm everywhere else.
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(32);
}
