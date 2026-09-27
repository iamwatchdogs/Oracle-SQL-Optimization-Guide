import { expect } from '@playwright/test';

// Selectors for the real, shipped disclosure markup.
export const PROSE_DETAILS = 'article.prose details';
export const EVIDENCE_KEY = '#evidence-key';
export const SITE_NAV_SUMMARY = 'header details > summary';
export const MOBILE_TOC = '[data-toc-mobile]';
export const THEME_TOGGLE = '#theme-toggle';

/**
 * Every `<details>` the project actually ships, with the route it ships on.
 * The disclosure stylesheet is scoped to the `details` element rather than to
 * `.prose` precisely because none of these live inside the article body — a
 * regression that re-scopes the CSS to `.prose` must fail here.
 */
export const SHIPPED_DISCLOSURES = [
  { name: 'site navigation', route: '/', selector: 'header details' },
  { name: 'evidence key', route: '/', selector: '#evidence-key' },
  { name: 'mobile table of contents', route: '/00-preface/', selector: MOBILE_TOC },
];

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
      /* The height the row settles at once fully open: an open row is
       * `grid-template-rows: 1fr`, so it ends at its content's natural height. */
      flowNaturalHeight: flow ? flow.scrollHeight : null,
      rows: flow ? getComputedStyle(flow).gridTemplateRows : null,
      padding: inner ? getComputedStyle(inner).paddingBlock : null,
    };
  });
}

/**
 * The computed `list-style-type` of a shipped disclosure's summary, measured on
 * the route that disclosure actually ships on.
 */
export async function summaryMarker(page, disclosure) {
  await page.goto(disclosure.route);
  return page
    .locator(`${disclosure.selector} > summary`)
    .first()
    .evaluate((el) => getComputedStyle(el).listStyleType);
}

/** Every computed property the disclosure component is allowed to set on a summary. */
export function summaryStyle(locator) {
  return locator.evaluate((summary) => {
    const s = getComputedStyle(summary);
    const rect = summary.getBoundingClientRect();
    return {
      display: s.display,
      cursor: s.cursor,
      minHeight: s.minHeight,
      height: Math.round(rect.height),
      paddingTop: s.paddingTop,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      color: s.color,
      listStyleType: s.listStyleType,
      alignItems: s.alignItems,
    };
  });
}

// Click the summary and sample the flow height on every animation frame,
// returning the distinct heights seen so a caller can assert a smooth collapse
// rather than an open->closed jump.
/** Wait for a disclosure to finish opening, rather than sleeping a fixed time. */
export function hasHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}

/**
 * Read a numeric CSS length.
 *
 * `getComputedStyle` hands back *strings* — `'12px'`, `'1px'`, `'0.5rem'` — so a
 * strict `Number()` coercion yields `NaN` for every one of them. The leading
 * numeric prefix is the only useful reading of such a value, which is exactly
 * what the lenient parse below does. Lengths only — for a duration use `ms`.
 */
export function px(value) {
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- "12px"/"1px" coerce to NaN under Number().
  return Number.parseFloat(value);
}

/**
 * Read a CSS duration as milliseconds.
 *
 * `getComputedStyle` reports `transitionDuration` and `animationDuration` in
 * *seconds* — `'0.28s'`, `'0.18s'` — never in the `'280ms'` form a stylesheet
 * author writes. `px()` is therefore the wrong reader here: it returns `0.28`
 * for a 280ms curve, two orders of magnitude away from the `280` the design
 * system specifies. This normalises both spellings to milliseconds, and reads
 * the first entry of a comma-separated list (the repeated value CSS emits).
 */
export function ms(value) {
  const first = value.split(',')[0].trim();
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- "0.28s"/"280ms" coerce to NaN under Number().
  const amount = Number.parseFloat(first);
  return first.endsWith('ms') ? amount : amount * 1000;
}

/**
 * The decisive horizontal-overflow probe.
 *
 * `documentElement.scrollWidth > clientWidth` alone is not sufficient: content
 * living inside a legitimate horizontal scroll container (a wide markdown
 * table) is *supposed* to report a rect wider than the viewport, and reporting
 * that is not a defect. What matters is content that escapes every scroll
 * container and widens the document itself. This walks the tree and reports
 * only elements whose nearest scrollable ancestor is the document, i.e. real
 * layout escapes.
 *
 * `scrollContainer` is declared *inside* the callback on purpose: a
 * `page.evaluate` body is serialised and re-parsed in the page, so it closes
 * over nothing and every helper it calls has to live in the function body.
 */
export function findEscapingOverflow(page) {
  return page.evaluate(() => {
    /**
     * The nearest scrollable ancestor of `el`, described well enough to paste
     * into a Playwright selector. `null` means the document itself is the scroll
     * container.
     */
    function scrollContainer(el) {
      for (let node = el.parentElement; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX !== 'visible') {
          return (
            node.tagName.toLowerCase() +
            (node.className ? `.${String(node.className).split(/\s+/u).join('.')}` : '')
          );
        }
      }
      return null;
    }

    const docWidth = document.documentElement.clientWidth;
    const escapes = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.right <= docWidth + 1) {
        continue;
      }
      if (scrollContainer(el)) {
        continue;
      }
      escapes.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className || '').slice(0, 80),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: (el.textContent || '').trim().slice(0, 48),
      });
    }
    return { docWidth, documentScrollWidth: document.documentElement.scrollWidth, escapes };
  });
}

/*
 * Scroll to a fraction of the scrollable range and WAIT until it lands there.
 *
 * Four traps, each of which produced cross-engine failures:
 *
 * 1. `html { scroll-behavior: smooth }` is set project-wide, so a plain
 *    `window.scrollTo(0, y)` becomes a ~500ms animation and anything read
 *    afterwards still sees the OLD offset. `behavior: 'instant'` bypasses it.
 * 2. The final offset is CLAMPED to `scrollHeight - innerHeight`, so requested
 *    and reached offsets legitimately differ on the last row.
 * 3. The document height is not stable. A history restore re-collapses the
 *    mobile TOC panel, which animates `grid-template-rows` over 280ms and changes
 *    `scrollHeight` WHILE we are scrolling. Measuring the target once and waiting
 *    for it to be reached waits for a position that has already become wrong —
 *    Chromium overshot by 500px, WebKit by 300.
 *
 * So the target is recomputed against the live layout and re-applied until it
 * stops moving, rather than measured once.
 *
 * NOTE: `locator.evaluate(fn, arg)` calls `fn(element, arg)` — the element is
 * ALWAYS the first parameter. A single-parameter callback silently receives the
 * element instead of `ratio`, and `limit * <html>` is `NaN`, which makes
 * `scrollTo` a silent no-op: the helper reported success at offset 0 and every
 * assertion after it checked a page that had not moved. The guard below turns
 * that class of mistake into an immediate, obvious failure.
 */
export async function scrollToRatio(locator, ratio) {
  const landed = await locator.evaluate(async (_el, r) => {
    if (!Number.isFinite(r)) {
      throw new TypeError(
        `scrollToRatio: expected a finite ratio, received ${String(r)} — is the ` +
          'locator.evaluate callback missing its (_el, arg) signature?',
      );
    }
    const targetFor = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight;
      return Math.min(Math.round(limit * r), Math.max(0, limit));
    };
    const frame = () => {
      return new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const target = targetFor();
      const before = Math.round(window.scrollY);
      window.scrollTo({ top: target, behavior: 'instant' });
      /*
       * Sequential by necessity: each attempt measures the layout the previous
       * scroll produced. Running these concurrently would fire a dozen scrolls
       * against stale measurements, which is the bug this loop exists to fix.
       */
      // oxlint-disable-next-line no-await-in-loop
      await frame();
      const after = Math.round(window.scrollY);
      if (after === targetFor()) {
        return after;
      }
      // The layout stopped moving but we are not on target; further attempts
      // will not help, so report where we actually are.
      if (attempt > 1 && before === after) {
        return after;
      }
    }
    return Math.round(window.scrollY);
  }, ratio);

  await expect
    .poll(() => locator.evaluate(() => Math.round(window.scrollY)), {
      message: `page never settled at scroll offset ${landed}`,
    })
    .toBe(landed);
  return landed;
}
