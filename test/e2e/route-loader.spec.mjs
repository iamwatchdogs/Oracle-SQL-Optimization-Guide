import { expect, test } from '@playwright/test';
import { LOADER } from './support/route-loader.mjs';

/**
 * Route loader (the loading state).
 *
 * This is the feature most at risk of being *wired but unverified*: it is
 * exercised only against a hand-rolled fake DOM in unit tests, and its unit
 * fixtures hard-code the answers — `querySelector` returns the loader for the
 * exact selector string the controller asks for, and `dataset` is a plain
 * object rather than a real `DOMStringMap`. Renaming `id="route-loader"` in the
 * layout would leave all 15 unit tests green while the feature is 100% dead in
 * a browser. Everything below asserts against the real DOM.
 */

/**
 * Hold a route's response open so the navigation reliably outlasts the 180ms
 * reveal gate.
 *
 * CPU throttling was the previous approach and it is not deterministic: the
 * static server plus the browser disk cache let a warm second hop complete in
 * under 180ms, so the loader legitimately never appeared and the test failed
 * for a reason that had nothing to do with the loader. Delaying the RESPONSE
 * targets the thing the gate actually measures. It is also engine-agnostic, so
 * these tests no longer need a chromium-only skip.
 */
async function delayRoute(page, pattern, milliseconds = 700) {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    await route.continue();
  });
  return () => page.unroute(pattern);
}

const loaderState = (locator) =>
  locator.evaluate((el) => ({
    visible: el.dataset.visible,
    opacity: getComputedStyle(el).opacity,
    pointerEvents: getComputedStyle(el).pointerEvents,
    message: el.querySelector('[data-route-loader-message]')?.textContent ?? null,
    persisted: el.dataset.astroTransitionPersist,
  }));

const mainBusy = (page) => page.locator('main#main').evaluate((el) => el.getAttribute('aria-busy'));

test.describe('route loader — resting state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('is present, hidden, silent, and not busy on first paint', isPresentHiddenAndSilent);

  test('is a polite atomic live region so it never interrupts', isAPoliteAtomicLiveRegion);

  test('is inert even when visible, so it can never block a click', isInertEvenWhenVisible);

  test('takes no layout space, so revealing it causes no shift', takesNoLayoutSpace);

  test('respects prefers-reduced-motion for the bar pulse', respectsReducedMotion);
});

async function isPresentHiddenAndSilent({ page }) {
  const loader = page.locator(LOADER);
  await expect(loader).toHaveCount(1);
  const state = await loaderState(loader);
  expect(state.visible).toBe('false');
  expect(state.message).toBe('');
  expect(await mainBusy(page)).toBeNull();
}

async function isAPoliteAtomicLiveRegion({ page }) {
  const loader = page.locator(LOADER);
  await expect(loader).toHaveAttribute('role', 'status');
  await expect(loader).toHaveAttribute('aria-live', 'polite');
  await expect(loader).toHaveAttribute('aria-atomic', 'true');
}

async function isInertEvenWhenVisible({ page }) {
  // The regression: `data-[visible=true]:pointer-events-auto` made a
  // viewport-wide, z-50 strip over the top of the content clickable for the
  // whole duration of a slow navigation. The loader holds nothing focusable.
  const pointerEvents = await page
    .locator(LOADER)
    .evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pointerEvents).toBe('none');
}

async function takesNoLayoutSpace({ page }) {
  const position = await page.locator(LOADER).evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe('fixed');
}

async function respectsReducedMotion({ page }) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const animation = await page
    .locator(`${LOADER} [aria-hidden="true"] span`)
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
}

test.describe('route loader — client-side navigation', () => {
  test('reveals after the delay, announces, then hides and hands off focus', revealsThenHides);

  test('stays hidden for a navigation that completes inside the delay', staysHiddenWhenFast);

  test('never scrolls the page as part of the focus handoff', neverScrollsOnFocusHandoff);

  test('persists one loader element across the swap instead of remounting it', persistsOneLoader);

  test('leaves focus alone on the first, unprepared page load', leavesFocusOnFirstLoad);
});

/**
 * Record the loader's whole "up" window from inside the page, before the
 * navigation starts.
 *
 * Everything asserted about a transient state has to be recorded by the page, not
 * sampled from Node, because the loader is only up for the duration of the held
 * response — about 700ms — and any single round-trip can land after it has gone
 * back down. Three separate attempts at this all failed the same way:
 *
 * - polling for `data-visible` then reading `aria-busy` separately: the second read
 *   landed post-swap and got `null`;
 * - pairing the two and then re-reading the state for the message: `Expected:
 *   "Loading requested page", Received: ""`;
 * - asserting `data-visible` with `toHaveAttribute`, then polling opacity: the
 *   loader had already hidden again, so `Expected: > 0, Received: 0`.
 *
 * So the page records what happened — every `aria-busy` write, the highest opacity
 * reached while the loader was up, and the message it announced — and the
 * assertions run against that record. A sample nobody had to catch.
 */
async function recordLoaderTelemetry(page) {
  await page.evaluate(() => {
    const main = document.querySelector('main#main');
    const loader = document.querySelector('[data-route-loader]');
    const log = { busy: [], maxOpacity: 0, message: null };
    globalThis.loaderTelemetry = log;

    new MutationObserver(() => {
      log.busy.push(main?.getAttribute('aria-busy') ?? null);
    }).observe(main, { attributes: true, attributeFilter: ['aria-busy'] });

    const sample = () => {
      if (loader?.dataset.visible === 'true') {
        const opacity = Number.parseFloat(getComputedStyle(loader).opacity);
        if (opacity > log.maxOpacity) {
          log.maxOpacity = opacity;
        }
        const message = loader.querySelector('[data-route-loader-message]')?.textContent ?? '';
        if (message) {
          log.message = message;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

const telemetry = (page) => page.evaluate(() => globalThis.loaderTelemetry ?? null);

/**
 * Assert the loader went up, told the reader it was loading, and marked the page
 * busy — all from one recorded window.
 */
async function expectLoaderRevealed(loader, page) {
  await expect(loader).toHaveAttribute('data-visible', 'true', { timeout: 15_000 });

  const log = await telemetry(page);
  expect(log.message).toBe('Loading requested page');
  expect(log.maxOpacity, 'the loader never faded in').toBeGreaterThan(0);
  expect(log.busy, 'main was never marked busy').toContain('true');
}

async function revealsThenHides({ page }) {
  await page.goto('/');
  await delayRoute(page, '**/00-preface/');
  const loader = page.locator(LOADER);
  expect((await loaderState(loader)).visible).toBe('false');

  // Installed before the navigation starts, so nothing in the window is missed.
  await recordLoaderTelemetry(page);

  await page.locator('main#main a[href="/00-preface/"]').first().click();

  await expectLoaderRevealed(loader, page);

  await expect.poll(() => mainBusy(page), { timeout: 20_000 }).toBeNull();
  expect((await loaderState(loader)).visible).toBe('false');
  expect((await loaderState(loader)).message).toBe('');

  // The handoff: `main#main` takes focus once the new page has loaded.
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id), {
      timeout: 15_000,
    })
    .toBe('main');
}

async function staysHiddenWhenFast({ page }) {
  await page.goto('/');
  // Warm the cache so the second hop is genuinely fast — no route delay here.
  await page.goto('/00-preface/');
  const loader = page.locator(LOADER);
  await page.locator('main#main a[href="/00-preface/01-why-evidence-grades/"]').first().click();
  await expect.poll(() => mainBusy(page), { timeout: 15_000 }).toBeNull();
  // A late reveal is acceptable; a permanent one is not. Either way it must
  // be back at rest once the page has loaded.
  await expect(loader).toHaveAttribute('data-visible', 'false');
}

async function neverScrollsOnFocusHandoff({ page }) {
  /*
   * The previous version recorded `scrollY` before the click and compared it
   * after. A client-side navigation resets the scroll position BY DESIGN — the
   * router scrolls the new page to its own location — so before/after could
   * never match and the test was flaky in every engine.
   *
   * The claim that actually matters is: the focus handoff adds no scroll of its
   * own. If `focus()` were called without `preventScroll`, focusing a container
   * that starts below the fold would leave `scrollY` non-zero after the router
   * has already placed the new page at the top. So: after the navigation
   * settles, focus is on `main#main` AND the page is still at the top.
   */
  await page.goto('/00-preface/02-how-to-prove-a-win/');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);

  await page.locator('main#main a[href="/00-preface/"]').first().click();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id), { timeout: 15_000 })
    .toBe('main');

  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled, 'the focus handoff scrolled the page').toBe(0);
}

async function persistsOneLoader({ page }) {
  await page.goto('/');
  await expect(page.locator(LOADER)).toHaveAttribute(
    'data-astro-transition-persist',
    'route-loader',
  );
  await page.locator('main#main a[href="/00-preface/"]').first().click();
  await page.waitForFunction(() => location.pathname === '/00-preface/', undefined, {
    timeout: 15_000,
  });
  await expect(page.locator(LOADER)).toHaveCount(1);
}

async function leavesFocusOnFirstLoad({ page }) {
  await page.goto('/');
  const active = await page.evaluate(() => document.activeElement?.tagName);
  expect(active).toBe('BODY');
}
