/**
 * Shared harness for the browser probes in this directory.
 *
 * The probes are diagnostic scripts, not tests: they print the computed layout
 * of a real page so a defect can be localised before a spec is written to
 * guard it. Every probe's finding has been promoted to a real spec — the
 * mapping is recorded in `README.md`.
 *
 * They talk to the developer's already-running dev server on :4321. Nothing
 * here starts or stops a server, and nothing outside `test/` is touched.
 */
import { chromium } from 'playwright';

export const DEV_SERVER = process.env.PROBE_BASE_URL ?? 'http://localhost:4321';

export const ROUTES = {
  home: '/',
  preface: '/00-preface/',
  howToProve: '/00-preface/02-how-to-prove-a-win/',
  measureFirst: '/01-proven-techniques/01-measure-first/',
  oraclesOwnPapers: '/02-papers-behind-recipes/02-oracles-own-papers/',
  bonus: '/08-bonus-batch-api/',
};

export const MOBILE = { width: 390, height: 844 };
export const DESKTOP = { width: 1280, height: 900 };

/** Open a page against the dev server, run `body`, and always close cleanly. */
export async function withPage(viewport, route, body) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.goto(DEV_SERVER + route, { waitUntil: 'networkidle' });
    return await body(page);
  } finally {
    await browser.close();
  }
}

/** Open one page per route in a single browser. */
export async function withPages(viewport, routes, body) {
  const browser = await chromium.launch();
  try {
    for (const route of routes) {
      const page = await browser.newPage({ viewport });
      await page.goto(DEV_SERVER + route, { waitUntil: 'networkidle' });
      await body(page, route);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/**
 * The decisive horizontal-overflow probe.
 *
 * `documentElement.scrollWidth > clientWidth` is not sufficient on its own:
 * content inside a legitimate horizontal scroll container (a wide markdown
 * table) is *supposed* to report a rect wider than the viewport. What matters is
 * content that escapes every scroll container and widens the document. The same
 * function backs `findEscapingOverflow` in `test/e2e/support/disclosure.mjs`.
 */
export function escapingOverflow() {
  const docWidth = document.documentElement.clientWidth;
  const escapes = [];
  const scrollContainer = (el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') {
        return node.tagName.toLowerCase();
      }
    }
    return null;
  };
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
}

export const px = (value) => {
  const parsed = Number.parseFloat(value);
  return String(value).endsWith('ms') ? parsed : parsed * (String(value).endsWith('s') ? 1000 : 1);
};
