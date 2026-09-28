/**
 * Measurement helpers for the reading-surface specs.
 *
 * These live here, not inline in the spec, for two reasons. The measurement code
 * is long enough that keeping it in a `test()` body would push the callback past
 * the project's 50-line function budget and bury the assertion in its own
 * scaffolding. And the numbers they produce are the POINT of the assertions: a
 * failure message should quote a measurement, so the measurement has a name.
 *
 * Everything returns plain data. Nothing here asserts — a helper that both
 * measures and judges hides which of the two failed.
 */

/** The right edge of the reading prose, in CSS pixels. */
export const proseRight = (page) =>
  page.evaluate(() => {
    const article = document.querySelector('article.prose');
    return Math.round(article.getBoundingClientRect().right);
  });

/**
 * The horizontal edges of every rule-bearing block on an interior page.
 *
 * The defect this reads: the article's `68ch` measure is 89px narrower than the
 * 46rem reading track it sits in, so anything sized to the track broke the page's
 * single right edge in two. Prose, h2 rules and the takeaway all ended at one x
 * while the pager ran 89px past it.
 */
export const readingEdges = (page) =>
  page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (element === null) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right) };
    };
    return {
      pager: box('nav[aria-label="Book navigation"]'),
      firstCell: box('nav[aria-label="Book navigation"] a[rel="prev"]'),
      lastCell: box('nav[aria-label="Book navigation"] a:last-of-type'),
      bookHome: box('main a[href="/"]'),
      h2Rule: box('article.prose h2'),
    };
  });

/**
 * Every table on the page, with the geometry that decides whether the wrapper is
 * doing its job.
 *
 * `display: table` on the element and `overflow-x: auto` on the parent are both
 * load-bearing: `overflow` is not honoured on a table box, so making the table
 * the scroll container clamps `overflow-x` back to `visible` AND drops the row
 * groups into an anonymous fit-content box — which is how a two-column table
 * rendered 239px wide inside a 647px measure.
 */
export const tableGeometry = (page) =>
  page.evaluate(() => {
    const article = document.querySelector('article.prose');
    return {
      measure: Math.round(article.getBoundingClientRect().width),
      tables: [...article.querySelectorAll('table')].map((table) => ({
        width: Math.round(table.getBoundingClientRect().width),
        display: getComputedStyle(table).display,
        scroller: getComputedStyle(table.parentElement).overflowX,
        scrollerWidth: Math.round(table.parentElement.getBoundingClientRect().width),
      })),
    };
  });

/** The takeaway's frame and fill, so the hairline can be compared against them. */
export const takeawayFrame = (page) =>
  page.evaluate(() => {
    const block = document.querySelector('article.prose > p:has(> strong:only-child)');
    if (block === null) {
      return null;
    }
    const styles = getComputedStyle(block);
    return {
      top: styles.borderTopWidth,
      bottom: styles.borderBottomWidth,
      color: styles.borderTopColor,
      background: styles.backgroundColor,
    };
  });

/** The centre line of the home page's two stacked content regions. */
export const homeCentres = (page) =>
  page.evaluate(() => {
    const centre = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return Math.round(rect.left + rect.width / 2);
    };
    return {
      viewport: Math.round(window.innerWidth / 2),
      contributions: centre('section[aria-labelledby="contributions-heading"] ol'),
      prose: centre('main .prose'),
    };
  });

/** The three strings a page repeats, for the running-head duplication check. */
export const pageStrings = (page) =>
  page.evaluate(() => ({
    runningHead:
      document
        .querySelector('div[aria-hidden="true"].running-head')
        ?.textContent.replaceAll(/\s+/gu, ' ')
        .trim() ?? '',
    h1: document.querySelector('h1')?.textContent.trim() ?? '',
    crumbs: [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((item) =>
      item.textContent.replaceAll(/\s+/gu, ' ').trim(),
    ),
  }));

/** The mobile TOC disclosure band, measured. */
export const tocSummary = (page) =>
  page.evaluate(() => {
    const element = document.querySelector('[data-toc-mobile] > summary');
    const [icon, label, readout] = element.children;
    const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight);
    return {
      height: Math.round(element.getBoundingClientRect().height),
      label: {
        text: label.textContent.trim(),
        width: Math.round(label.getBoundingClientRect().width),
        lines: Math.round(label.getBoundingClientRect().height / lineHeight),
      },
      icon: { width: Math.round(icon.getBoundingClientRect().width) },
      readout: {
        width: Math.round(readout.getBoundingClientRect().width),
        truncated: readout.scrollWidth > readout.clientWidth + 1,
      },
    };
  });

/**
 * How many annotated spans break across a line.
 *
 * `Range.getClientRects()` returns one rect per line box, so a count above one is
 * a hard break. A measured figure is the evidence on the page, and at 390px the
 * browser broke `E-Rows 1,000` at the hyphen into `E-` / `Rows 1,000`.
 */
export const wrappedAnnotations = (page) =>
  page.evaluate(() => {
    const count = (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length > 1;
      }).length;
    return { measured: count('.measured'), citations: count('a.citation') };
  });

/**
 * Content that escapes every scroll container and widens the document.
 *
 * `documentElement.scrollWidth` alone is not sufficient: content inside a
 * legitimate horizontal scroll container (a wide markdown table) is SUPPOSED to
 * report a rect wider than the viewport.
 */
export const escapingOverflow = (page) =>
  page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const hasScroller = (element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== 'visible') {
          return true;
        }
      }
      return false;
    };
    const escapes = [];
    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.right <= docWidth + 1 || hasScroller(element)) {
        continue;
      }
      escapes.push(`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)}`);
    }
    return { docWidth, scrollWidth: document.documentElement.scrollWidth, escapes };
  });

/** Every landmark on the page that has no accessible name. */
export const unnamedLandmarks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('nav, aside, section[aria-label], section[aria-labelledby]')]
      .filter((landmark) => {
        const labelledBy = landmark.getAttribute('aria-labelledby');
        const name =
          landmark.getAttribute('aria-label') ??
          (labelledBy === null
            ? null
            : document.querySelector(`#${labelledBy}`)?.textContent?.trim());
        return name === null || name === undefined || name.length === 0;
      })
      .map(
        (landmark) =>
          `${landmark.tagName.toLowerCase()}.${String(landmark.className).slice(0, 40)}`,
      ),
  );

/**
 * Run `body` against each route in turn, on the SAME page.
 *
 * This helper navigates one page in a loop, which the project's `no-await-in-loop`
 * rule rightly flags everywhere else. A single `page` is the thing being
 * measured, so the routes have to be walked one at a time.
 */
/* oxlint-disable no-await-in-loop -- see the note above */
export async function forEachRoute(page, routes, body) {
  for (const route of routes) {
    await page.goto(route);
    await body(route);
  }
}
/* oxlint-enable no-await-in-loop */

/**
 * Walk the pager's link graph with HTTP requests rather than clicks.
 *
 * Clicking `rel="next"` runs an Astro client navigation, which detaches the
 * element mid-click and makes a locator retry against a page that no longer
 * exists — and loading 37 pages in a browser is the slow way to ask a fast
 * question. Each href is read from the built HTML the pager was generated from,
 * so this follows exactly the links a reader would follow.
 */
export async function walkPager(request, start) {
  /*
   * Attribute order is not guaranteed — Astro emits `href` before `rel` — so the
   * pair is matched inside a single anchor tag rather than by assuming a
   * sequence. A regex that assumed the order matched nothing, the walk ended on
   * step one, and the failure surfaced three assertions later as a missing
   * `rel="prev"`.
   */
  const nextHref = (source) =>
    /<a\b[^>]*\brel="next"[^>]*>/u.exec(source)?.[0].match(/\bhref="([^"]+)"/u)?.[1] ?? null;
  const hasPrev = (source) => /<a\b[^>]*\brel="prev"/u.test(source);

  const visited = new Set([start]);
  const dead = [];
  let html = await (await request.get(start)).text();
  let route = start;

  for (let step = 0; step < 60; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each href is read from the page the previous step found
    const next = nextHref(html);
    if (next === null) {
      break;
    }
    if (visited.has(next)) {
      return { route, visited, dead, looped: next };
    }
    visited.add(next);
    // oxlint-disable-next-line no-await-in-loop -- the chain is read from the previous response
    const response = await request.get(next);
    if (response.status() !== 200) {
      dead.push(`${next} -> ${response.status()}`);
    }
    // oxlint-disable-next-line no-await-in-loop -- the chain is read from the previous response
    html = await response.text();
    route = next;
  }

  return { route, visited, dead, looped: null, hasPrev: hasPrev(html), hasNext: nextHref(html) };
}
