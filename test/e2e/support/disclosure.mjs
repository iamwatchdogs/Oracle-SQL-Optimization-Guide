import { expect } from '@playwright/test';

// Selectors for the real, shipped disclosure markup.
export const PROSE_DETAILS = 'article.prose details';
export const EVIDENCE_KEY = '#evidence-key';
export const SITE_NAV_SUMMARY = 'header details > summary';
export const THEME_TOGGLE = '#theme-toggle';

const DISCLOSURE_MARKUP = `
  <details class="group" data-e2e-disclosure>
    <summary>End-to-end disclosure body</summary>
    <div class="disclosure-content disclosure-flow">
      <div class="disclosure-content-inner disclosure-flow-inner">
        <p>First paragraph with enough copy to give the grid a measurable intrinsic height while it opens and collapses.</p>
        <p>Second paragraph so the open height is unambiguous across engines.</p>
        <p>Third paragraph adds margin above the collapse measurement floor.</p>
      </div>
    </div>
  </details>
`;

// Inject a production-shaped prose disclosure into a real page so the real
// stylesheet and the real delegated disclosure controller are exercised,
// independent of whether the (frequently edited) content has <details>.
export async function injectProseDisclosure(page) {
  await page.evaluate((markup) => {
    const prose = document.querySelector('article.prose');
    if (!prose) {
      throw new Error('no article.prose on page');
    }
    prose.insertAdjacentHTML('beforeend', markup);
  }, DISCLOSURE_MARKUP);
  return page.locator('[data-e2e-disclosure]');
}

export function measureDisclosure(locator) {
  return locator.evaluate((el) => {
    const flow = el.querySelector('.disclosure-flow');
    const inner = el.querySelector('.disclosure-content-inner');
    return {
      open: el.open,
      closing: Object.hasOwn(el.dataset, 'disclosureClosing'),
      flowHeight: flow ? +flow.getBoundingClientRect().height.toFixed(2) : null,
      rows: flow ? getComputedStyle(flow).gridTemplateRows : null,
      padding: inner ? getComputedStyle(inner).paddingBlock : null,
    };
  });
}

// Click the summary and sample the flow height on every animation frame,
// returning the distinct heights seen so a caller can assert a smooth collapse
// rather than an open->closed jump.
export function sampleCollapseHeights(locator, durationMs = 500) {
  return locator.evaluate(async (el, duration) => {
    const flow = el.querySelector('.disclosure-flow');
    const seen = [];
    el.querySelector('summary').click();
    const start = performance.now();
    return await new Promise((resolve) => {
      const tick = () => {
        const h = +flow.getBoundingClientRect().height.toFixed(1);
        if (seen.at(-1) !== h) {
          seen.push(h);
        }
        if (performance.now() - start < duration) {
          requestAnimationFrame(tick);
        } else {
          resolve(seen);
        }
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

export async function waitForDisclosureClosed(locator, timeout = 2000) {
  await expect
    .poll(
      async () => {
        const state = await measureDisclosure(locator);
        return state.open === false && state.closing === false && (state.flowHeight ?? 0) < 1;
      },
      { timeout, message: 'disclosure did not settle closed' },
    )
    .toBe(true);
}

export function hasHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}
