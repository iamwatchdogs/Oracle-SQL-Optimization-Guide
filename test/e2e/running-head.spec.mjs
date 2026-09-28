/*
 * The header's running head is page state, not chrome.
 *
 * The `Contents` trigger carries a section counter — `Section 02 / 09` on a chapter,
 * `09 sections` on the home page — and it is the running head this design system is
 * built around. It is therefore the one thing in the header that MUST change when a
 * client navigation lands.
 *
 * That is worth a test because of the change someone will eventually propose.
 *
 * `transition:persist` on the `<header>` is a very reasonable-looking idea: it would
 * make the site's chrome literally motionless across a swap, which sounds like the
 * obvious next step after a route transition. It is wrong here, and wrong in a way
 * that is invisible in a screenshot of a single page. A persisted element keeps its
 * DOM, so the counter rendered for the page you were on would survive the hop, and a
 * reader sitting in Section 03 would be looking at `Section 02 / 09` — a stale
 * position indicator in the one place the design uses a position indicator.
 *
 * The header is not furniture. The wordmark, the two dropdown triggers and the theme
 * toggle are; the counter is not. Persisting the element persists the counter with
 * it, and there is no way to persist the shell and re-render one child.
 *
 * So the header stays unpersisted, and its counter is re-rendered from the
 * destination on every navigation like everything else in the body. This spec is the
 * thing that catches the regression.
 */
import { expect, test } from '@playwright/test';
import { navigateTo } from './support/navigation.mjs';
import { SITE_NAV, SITE_NAV_SUMMARY } from './support/disclosure.mjs';

/**
 * The section counter inside the `Contents` trigger, in the header.
 *
 * Scoped to `span` because the disclosure caret beside it is an `aria-hidden="true"`
 * `svg` too, and a bare attribute selector matches both.
 */
const counter = (page) => page.locator(`${SITE_NAV_SUMMARY} span[aria-hidden="true"]`);

test.describe('the running head', () => {
  test('is re-rendered from the destination on a client navigation', async ({ page }) => {
    await page.goto('/');
    /* The home page has no section position, so it reports the count alone. */
    await expect(counter(page)).toHaveText('09 sections');

    /* One in-article link, one client-side hop. No reload, so nothing about this
       path re-runs the server render that produced the counter. */
    await navigateTo(page, '/00-preface/');

    await expect(counter(page)).toHaveText('Section 01 / 09');
  });

  test('holds steady within a section and moves when the section does', async ({ page }) => {
    await page.goto('/00-preface/');
    await expect(counter(page)).toHaveText('Section 01 / 09');

    /* Same section, a real hop: the counter is derived per page, so it must not
       drift or reset here. */
    await navigateTo(page, '/00-preface/02-how-to-prove-a-win/');
    await expect(counter(page)).toHaveText('Section 01 / 09');

    /* Now cross into another section, through the section list rather than an
       in-article link, because the boundary is exactly where the running head has to
       be right. */
    await page.locator(SITE_NAV_SUMMARY).click();
    const target = page.locator(`${SITE_NAV} a[href^="/01-proven-techniques/"]`).first();
    await expect(target).toBeVisible();
    await target.click();
    await page.waitForFunction(
      () => location.pathname.startsWith('/01-proven-techniques/'),
      undefined,
      { timeout: 15_000 },
    );

    await expect(counter(page)).toHaveText('Section 02 / 09');
  });
});
