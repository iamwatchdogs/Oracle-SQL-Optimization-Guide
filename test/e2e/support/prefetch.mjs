/*
 * Driving and measuring a scroll-driven prefetch in a real browser.
 *
 * A sibling of `test/e2e/support/fonts.mjs`, added for the same reason: the measurement belongs beside the
 * browser facts it depends on, and a spec carrying it inline was over the 300-line ceiling the linter holds
 * every file here to. `prefetch-scope.spec.mjs` holds the claims; this holds the instruments.
 */
import { expect } from '@playwright/test';
import { SITE_NAV, SITE_NAV_SUMMARY } from './disclosure.mjs';
import { waitForDisclosureSettled } from './disclosure-settle.mjs';

/**
 * The two anchors whose prefetch is a pager hop, read from the live DOM rather than named.
 *
 * `rel` is the discriminator the pager itself documents (`PrevNext.astro:73-77`), so this is the
 * project's own statement of what a pager cell is, not a second one written here.
 */
export const PAGER_CELLS =
  'nav[aria-label="Book navigation"] a[rel="prev"], nav[aria-label="Book navigation"] a[rel="next"]';

/**
 * Watch the network for chapter routes and nothing else.
 *
 * The filter is `pathname.endsWith('/')`, which is what every route in this book looks like served and what
 * no `_astro` asset, font or image looks like. A filter on SHAPE rather than on a list of expected URLs, so
 * it cannot accidentally exclude the very request under test.
 *
 * `page.on('request')` rather than a response listener: a prefetch served from cache after an earlier
 * request in the same test would emit no second request, and this suite asserts on the SET of destinations a
 * reader's scroll reaches. Playwright's fresh context per test is what makes the log cold.
 */
export const watchChapterRoutes = (page) => {
  const seen = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.endsWith('/')) {
      seen.push(pathname);
    }
  });
  return seen;
};

/**
 * Wait until at least `floor` requests are in AND nothing further arrives.
 *
 * Two waits, because there are two things to be sure of and one wait cannot be sure of both.
 *
 *   - ARRIVAL. The viewport strategy holds a 300 ms dwell timer per intersecting anchor
 *     (`prefetch/index.js:101-108`) and `IntersectionObserver` delivers on the frame after a layout change, so
 *     the last eligible link lands a few hundred milliseconds after the gesture that reached it — and how
 *     long exactly is a function of the machine. Polling the count with a generous timeout is the right wait
 *     for that, and its failure message carries the number.
 *   - QUIET. Once the expected set is in, anything further is a defect, so the assertion that catches it
 *     needs the log to have stopped rather than merely to have reached a count. Four consecutive 250 ms
 *     samples with no growth is ~1 s of silence, comfortably past the dwell timer, and self-terminating.
 *
 * A fixed `waitForTimeout` would have been shorter and would have made every spec below a race against the
 * machine it ran on — the reason `critical-css.spec.mjs` gives for its method, and the reason this one has any
 * method at all.
 */
export const quiesce = async (requests, floor, message) => {
  await expect
    .poll(() => requests.length, { message, timeout: 20_000, intervals: [150] })
    .toBeGreaterThanOrEqual(floor);

  let previous = requests.length;
  let quiet = 0;
  await expect
    .poll(
      () => {
        const size = requests.length;
        quiet = size === previous ? quiet + 1 : 0;
        previous = size;
        return quiet;
      },
      {
        message: `${message} — and then another prefetch arrived anyway`,
        timeout: 20_000,
        intervals: [250],
      },
    )
    .toBeGreaterThanOrEqual(4);
};

/**
 * The destinations a cold load of this page can legitimately prefetch, read from its own markup.
 *
 * All four groups come out of the DOM rather than out of this file, so the expected set moves with
 * the design and a link added to the pager or the section list does not turn this spec red for a
 * change that was intended.
 *
 * `pathname` and not `href`, deliberately: a fragment is not part of a pathname, so the "Full key"
 * link (`[...slug].astro:489`, `href="/#evidence-key"`) and the wordmark (`BaseLayout.astro:374`,
 * `href="/"`) both read as the site root here. Neither is eligible, so if either were, the site
 * root would appear in the observed set and fail the equality below — which is the point of reading
 * pathnames and not hrefs.
 */
export const expectedDestinations = (page) =>
  page.evaluate((pagerCells) => {
    const paths = (selector) =>
      [...document.querySelectorAll(selector)].map((anchor) => anchor.pathname);
    return {
      pager: [...new Set(paths(pagerCells))],
      sections: [...new Set(paths('nav[aria-label="Book sections"] a'))],
      outline: [...document.querySelectorAll('a[data-toc-link]')].map((a) =>
        a.getAttribute('href'),
      ),
      prose: [...new Set(paths('article a'))],
      root: paths('header a.running-head'),
      total: document.querySelectorAll('a').length,
    };
  }, PAGER_CELLS);

/**
 * Walk the whole document, one screen at a time, so every anchor passes through the viewport.
 *
 * This is what makes "the prose region fetches nothing" a real claim rather than a statement about a part
 * of the page the scroll happened to skip: a jump to the bottom would leave the middle of the article
 * unobserved, and stepping means every cross-reference and every rail link genuinely intersects.
 *
 * Two frames per step, because `IntersectionObserver` delivers on the frame after a layout change and the
 * strategy's dwell timer starts from that delivery — one frame can step past a link's entire intersection
 * window at a small viewport height. The exit condition compares `scrollY + innerHeight` against
 * `scrollHeight`, the guard `scrollToRatio` in `test/e2e/support/disclosure.mjs` insists on for the same
 * reason: a ratio against a `scrollHeight` that has not settled is a silent no-op, and the assertions
 * would then read a page that never moved.
 */
export const scrollThrough = (page) =>
  page.evaluate(async () => {
    const frame = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    const atEnd = () =>
      Math.round(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;

    for (let step = 0; step < 60 && !atEnd(); step += 1) {
      window.scrollBy(0, Math.round(window.innerHeight * 0.8));
      await frame();
      await frame();
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await frame();
    return { scrolled: window.scrollY, height: document.documentElement.scrollHeight };
  });

/**
 * The section rows a browser could see, read from the DOM by intersecting every clipping box.
 *
 * The honest answer to "how many of the nine does opening Contents fetch?" is "the ones it shows", and that
 * is not nine everywhere — nor, on the mobile project, even what the panel's own box suggests. The count is
 * measured here rather than written down.
 *
 * WHY A CLIP CHAIN AND NOT THE PANEL'S BOX. An earlier version asked whether a row sat inside the `<nav>`'s
 * bounding box and the viewport, and reported `08-bonus-batch-api` as visible on the mobile project. It is
 * not: that row spans y 770-874 on an 839px viewport, so 69px of it IS on screen — and its ancestor
 * `.disclosure-flow-inner` (`BaseLayout.astro:514`) carries `overflow-y: hidden` at 587px tall, which is
 * `max-[48rem]:max-h-[70vh]` applied one wrapper higher than the scroller. 74px of the row sits inside a box
 * the browser clips away, and Chromium reports `isIntersecting: false`, `intersectionRatio: 0`.
 *
 * So the model is IntersectionObserver's own: a row counts when its rect OVERLAPS the viewport and every
 * ancestor whose `overflow-y` is not `visible`. Overlap rather than containment, because containment is the
 * wrong question — the runtime prefetches on a single visible pixel, and the 25px of `07-appendix-sources`
 * showing inside that clip is why the mobile project fetches eight of the nine. Measured, both phases: at
 * 1280x720 the `<nav>` scrollport is 622px of 845px with nothing clipping above it, so 8 rows at rest and all
 * 9 once scrolled to the end; at 412x915 it reports `clientHeight` 741 against `scrollHeight` 777, so its own
 * scroll reveals 36px — less than the 69px of the row below — and the 587px clip above keeps the ninth row
 * invisible at both positions.
 */
export const onScreenRows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('nav[aria-label="Book sections"] a')]
      .filter((anchor) => {
        const row = anchor.getBoundingClientRect();
        if (row.bottom <= 0 || row.top >= window.innerHeight) {
          return false;
        }
        /*
         * WALK UP FROM THE ROW, not down from `<html>`. The first version of this loop started at
         * `document.documentElement` and asked each element for its `overflowY` — and
         * `documentElement.parentElement` is `null`, so it examined exactly one element, found
         * `visible`, and reported all nine rows as on screen. Which is the number the assertion then
         * failed on, so the mistake was loud rather than silent; a `clips.length` floor would have
         * caught it sooner and is left out only because the per-row assertion already is that floor.
         */
        for (
          let element = anchor.parentElement;
          element !== null;
          element = element.parentElement
        ) {
          if (getComputedStyle(element).overflowY === 'visible') {
            continue;
          }
          const clip = element.getBoundingClientRect();
          if (row.bottom <= clip.top || row.top >= clip.bottom) {
            return false;
          }
        }
        return true;
      })
      .map((anchor) => anchor.pathname),
  );

/**
 * The distinct chapter routes the log holds, minus the navigation that got us here.
 *
 * Exactly ONE occurrence of the current page's own path is dropped, and only the first.
 * `watchChapterRoutes` is attached before `goto` so it can also see a prefetch issued during load, and the
 * document request is a chapter route like any other — so the navigation is in the log and has to come out.
 * `canPrefetchUrl` rejects a same-pathname URL (`prefetch/index.js:156`), so any FURTHER occurrence could
 * only be a prefetch the runtime should have refused, and the rail's 34 fragment links — stripped to this
 * very URL by `prefetch/index.js:128` — are exactly what that would look like.
 */
export const observedDestinations = (requests, page) => {
  const here = new URL(page.url()).pathname;
  const distinct = [...new Set(requests)];
  const at = distinct.indexOf(here);
  if (at >= 0) {
    distinct.splice(at, 1);
  }
  return distinct;
};

/**
 * Open `Contents` and put all nine of its rows in front of the reader, in two phases.
 *
 * THE PANEL SCROLLS, and which row that costs is a browser detail. `Contents` is a 22rem dropdown with its
 * own scroller (`BaseLayout.astro:513-517`), and at 1280x720 it is not tall enough for its contents — the
 * `<nav>` reports `clientHeight` 622 against `scrollHeight` 845. So the panel is scrolled to its top, the
 * log is allowed to go quiet, and only then is it scrolled to its end and allowed to go quiet again.
 *
 * Each phase gets a real quiescence window rather than a fixed pause, because what is waited for is the
 * strategy's own 300 ms dwell timer (`prefetch/index.js:101-108`) and a phase boundary arriving before the
 * timer fires cancels it — `IntersectionObserver` clears the timeout whenever a row leaves the viewport
 * (`prefetch/index.js:109-113`). A single scroll to the end was tried first and lost exactly one row on every
 * run, a different row each time (`01-proven-techniques` in Chromium and WebKit, `08-bonus-batch-api` in
 * Firefox). Scrolling the PANEL and not the window: the dropdown is `position: absolute` inside a
 * `sticky top-0` header, so it travels with the header and the window's offset says nothing about it.
 */
export const revealSectionList = async (page, requests) => {
  const nav = page.locator(SITE_NAV);
  await page.locator(SITE_NAV_SUMMARY).click();
  await expect(nav).toHaveAttribute('open', '');
  await waitForDisclosureSettled(nav);

  const scrollPanelTo = (edge) =>
    page.evaluate((where) => {
      const list = document.querySelector('header #site-nav nav');
      if (list !== null) {
        list.scrollTop = where === 'end' ? list.scrollHeight : 0;
        return list.scrollHeight > list.clientHeight;
      }
      return false;
    }, edge);

  const panel = await page.evaluate(() => {
    const list = document.querySelector('header #site-nav nav');
    const row = document.querySelector('nav[aria-label="Book sections"] a');
    return {
      overflow: list.scrollHeight - list.clientHeight,
      rowHeight: row === null ? 0 : row.getBoundingClientRect().height,
    };
  });

  await scrollPanelTo('start');
  await quiesce(requests, 1, 'opening Contents prefetched nothing at all');

  /* Read AFTER the quiescence and before the second scroll, so it describes the rows the reader was
     actually looking at when the first batch of prefetches went out. */
  const atRest = await onScreenRows(page);
  await scrollPastTheFold(page, requests, panel, scrollPanelTo);
  return atRest;
};

/*
 * Phase two, on its own so that `revealSectionList` reads as the two gestures it is rather than as one
 * long function — and so the floor it waits on is stated next to the reason it is conditional.
 *
 * `before + 1` only when the overflow is at least one row, and the distinction is measured rather than
 * guessed. A row that is even partly inside the scrollport already intersects, so its dwell timer is
 * already running — a scroll shorter than a row cannot reveal anything that was not already counted. On
 * the mobile project the panel overflows by 36px against a 69px row (`scrollHeight` 777, `clientHeight`
 * 741, measured), so every row was already partly visible and demanding a NINTH request after the scroll
 * was a timeout rather than an assertion; on the three 1280x720 projects the overflow is 223px and the
 * ninth row is the whole point of the scroll.
 */
const scrollPastTheFold = async (page, requests, panel, scrollPanelTo) => {
  if (panel.overflow <= 0) {
    return;
  }
  const before = requests.length;
  await scrollPanelTo('end');
  await quiesce(
    requests,
    panel.overflow >= panel.rowHeight ? before + 1 : before,
    'scrolling the section panel to its end prefetched nothing',
  );
};
