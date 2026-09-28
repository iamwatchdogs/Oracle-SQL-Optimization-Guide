/**
 * Full-site defect sweep — one bounded pass over every route and viewport.
 *
 * This is a PROBE, not a spec: it prints machine-checkable defects across the
 * whole surface so they can be batched into a single fix round. Everything it
 * asserts is promoted to a real guard in `test/e2e/` or `test/integration/`; the
 * mapping is recorded in `test/probe/README.md`.
 *
 * What it covers per route x viewport x theme:
 *   1. horizontal overflow that escapes every scroll container
 *   2. touch-target size for every interactive element
 *   3. computed colour contrast for every text node
 *   4. non-text (UI boundary) contrast for control edges
 *   5. document semantics: heading order, landmark labels, duplicate ids
 *   6. accessible names and label-in-name on interactive elements
 *   7. aria references that point at nothing
 *   8. console and page errors
 *
 * Usage:
 *   node test/probe/audit-sweep.mjs                    # all routes, desktop+mobile, dark+light
 *   node test/probe/audit-sweep.mjs --only=/04-recipes # route substring filter
 *   node test/probe/audit-sweep.mjs --shots            # also write PNGs to test/probe/__shots__
 *   node test/probe/audit-sweep.mjs --viewports=mobile # desktop,mobile,tablet
 *   node test/probe/audit-sweep.mjs --themes=dark      # dark,light
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4321';
const SHOT_DIR = new URL('./__shots__/', import.meta.url);
const REPORT = new URL('./__audit-sweep.json', import.meta.url);

const ROUTES = [
  '/',
  '/00-preface/',
  '/00-preface/01-why-evidence-grades/',
  '/00-preface/02-how-to-prove-a-win/',
  '/01-proven-techniques/',
  '/01-proven-techniques/01-measure-first/',
  '/01-proven-techniques/02-stats-run-the-show/',
  '/01-proven-techniques/03-indexes-and-layout/',
  '/01-proven-techniques/04-let-oracle-rewrite/',
  '/01-proven-techniques/05-stabilize-and-ship-safely/',
  '/02-papers-behind-recipes/',
  '/02-papers-behind-recipes/01-how-to-read-a-db-paper/',
  '/02-papers-behind-recipes/02-oracles-own-papers/',
  '/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/',
  '/03-toolbox/',
  '/03-toolbox/01-measure-with-xplan-and-monitor/',
  '/03-toolbox/02-freeze-work-with-sts/',
  '/03-toolbox/03-load-test-without-prod/',
  '/03-toolbox/04-static-checks-before-db-time/',
  '/04-recipes/',
  '/04-recipes/01-freeze-with-sts/',
  '/04-recipes/02-before-after-with-spa/',
  '/04-recipes/03-stats-pipeline-you-can-script/',
  '/04-recipes/04-safe-ddl-and-ci-gates/',
  '/05-feedback-loop/',
  '/05-feedback-loop/01-one-change-at-a-time/',
  '/05-feedback-loop/02-noise-floor-and-repetition/',
  '/05-feedback-loop/03-accept-or-rollback-gate/',
  '/05-feedback-loop/04-memory-and-when-to-stop/',
  '/06-oss-guide/',
  '/06-oss-guide/01-how-to-vet-oss/',
  '/06-oss-guide/02-parse-lint-test-trio/',
  '/06-oss-guide/03-what-has-no-oss-replacement/',
  '/07-appendix-sources/',
  '/07-appendix-sources/01-how-citations-work/',
  '/07-appendix-sources/02-version-drift-survival/',
  '/08-bonus-batch-api/',
  '/404-probe/',
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

/* Touch target floor (WCAG 2.5.8) and its tolerance. Sub-pixel layout means a
 * `min-h-11` cell can measure 43.99px, so the compare is `floor - 0.5`. */
const TOUCH_MIN = 44;
const TOUCH_TOLERANCE = 0.5;

const args = process.argv.slice(2);
const flag = (name) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const has = (name) => args.includes(`--${name}`);

const only = flag('only');
const wantShots = has('shots');
const vpFilter = flag('viewports');
const themes = flag('themes') || 'dark,light';

const viewports = Object.entries(VIEWPORTS).filter(
  ([name]) => vpFilter.length === 0 || vpFilter.split(',').includes(name),
);
const themeList = themes.split(',');
const routes = only.length > 0 ? ROUTES.filter((route) => route.includes(only)) : ROUTES;

/* ------------------------------------------------------------------ *
 * In-page audit. Runs entirely inside the browser so it sees the same
 * computed styles, cascade and layout the reader does.
 * ------------------------------------------------------------------ */
const AUDIT = ({ touchMin }) => {
  const out = {
    overflow: null,
    targets: [],
    contrast: [],
    ui: [],
    semantics: [],
    names: [],
    aria: [],
  };

  /* ---- colour maths ---------------------------------------------- */
  const srgb = (channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const luminance = ([r, g, b]) =>
    0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);

  const contrast = (a, b) => {
    const [hi, lo] =
      luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
    return (hi + 0.05) / (lo + 0.05);
  };

  const parse = (value) => {
    const match = /rgba?\(([^)]+)\)/u.exec(String(value));
    if (match === null) {
      return null;
    }
    const parts = match[1]
      .split(/[\s,/]+/u)
      .filter(Boolean)
      .map(Number);
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
  };

  const over = (foreground, background, alpha) =>
    foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));

  const hex = (rgb) =>
    `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

  /** Composite every ancestor background down to the first opaque one. */
  const backdrop = (element) => {
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const background = parse(getComputedStyle(node).backgroundColor);
      if (background !== null && background.alpha > 0) {
        layers.push(background);
        if (background.alpha === 1) {
          break;
        }
      }
    }
    if (layers.length === 0) {
      return [0, 0, 0];
    }
    let result = layers.at(-1).rgb;
    for (let index = layers.length - 2; index >= 0; index -= 1) {
      result = over(layers[index].rgb, result, layers[index].alpha);
    }
    return result;
  };

  const visible = (element) => {
    const styles = getComputedStyle(element);
    if (
      styles.display === 'none' ||
      styles.visibility === 'hidden' ||
      Number(styles.opacity) === 0
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  /**
   * A closed `<details>` still lays its panel out and then clips it, so a naive
   * rect check reports the hidden nav panel's links as visible. Any element with
   * zero-size clipping ancestors is out of play.
   */
  const clippedAway = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      if (node.tagName === 'DETAILS' && node.open === false) {
        const flow = node.querySelector('.disclosure-flow');
        if (flow !== null && node.contains(element)) {
          return true;
        }
      }
    }
    return false;
  };

  /*
   * Escape the id before it goes into a selector.
   *
   * The site's headings are numbered, so their slugs start with a digit —
   * `id="1-claim"`, `id="1-build-a-realistic-mix"`, and 20-odd more. That is a
   * valid HTML id and works for fragment navigation, but a CSS ID selector may not
   * start with a digit, so a bare `querySelector('#1-claim')` throws a SyntaxError.
   * The throw aborted the whole audit for 180 of 228 runs, which is why 180 runs
   * carried nothing but an error and why the light-mode contrast pass had only
   * ever been measured on 48 runs.
   *
   * `CSS.escape` is used rather than `getElementById` so this stays a selector
   * query, and an empty id — which `CSS.escape` passes through unchanged, giving
   * the invalid selector `#` — is short-circuited.
   */
  const byId = (id) => (id ? document.querySelector(`#${CSS.escape(id)}`) : null);

  /* ---- 1. escaping horizontal overflow --------------------------- */
  {
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
      if (
        rect.width <= 0 ||
        rect.right <= docWidth + 1 ||
        hasScroller(element) ||
        clippedAway(element)
      ) {
        continue;
      }
      escapes.push({
        tag: element.tagName.toLowerCase(),
        cls: String(element.className).slice(0, 70),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        text: (element.textContent ?? '').trim().slice(0, 44),
      });
    }
    out.overflow = {
      clientW: docWidth,
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      escapes: escapes.slice(0, 12),
    };
  }

  /* ---- 2. touch targets ------------------------------------------ */
  {
    for (const element of document.querySelectorAll(
      'a, button, summary, input, select, textarea, [role="button"]',
    )) {
      if (
        !visible(element) ||
        clippedAway(element) ||
        element.closest('[aria-hidden="true"]') !== null
      ) {
        continue;
      }
      /*
       * A visually-hidden control is not a target yet.
       *
       * The skip link is `sr-only` until it takes focus, at which point the
       * `focus-visible:not-sr-only` sibling class restores it. Measuring it in its
       * hidden state reports a 50x30 target on every one of the 228 runs, for a
       * control that is never seen at that size. `sr-only` is the project's own
       * utility, so the class is the right signal — a 1px-clip test would miss this
       * case, where the element keeps its box and only its paint is suppressed.
       */
      if (element.classList.contains('sr-only')) {
        continue;
      }
      const text = (element.textContent ?? '').trim();
      /* An inline link in a sentence is exempt from 2.5.8; a short one is
       * punctuation, not a control. */
      if (getComputedStyle(element).display === 'inline' && text.length < 3) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      /* The threshold is passed in rather than read from a module constant: this
       * whole block runs inside the page, where the Node-side constants above do
       * not exist. `TOUCH_MIN - TOUCH_TOLERANCE` is 43.5. */
      if (rect.width >= touchMin && rect.height >= touchMin) {
        continue;
      }
      out.targets.push({
        tag: element.tagName.toLowerCase(),
        cls: String(element.className).slice(0, 70),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        text: (text || element.getAttribute('aria-label') || '').trim().slice(0, 40),
      });
    }
  }

  /* ---- 3. text contrast ------------------------------------------ */
  {
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (
          parent === null ||
          parent.closest('script, style, [aria-hidden="true"], pre') !== null
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!visible(element) || clippedAway(element)) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }
      const styles = getComputedStyle(element);
      const foreground = parse(styles.color);
      if (foreground === null) {
        continue;
      }
      const background = backdrop(element);
      const flat =
        foreground.alpha < 1 ? over(foreground.rgb, background, foreground.alpha) : foreground.rgb;
      const size = Number.parseFloat(styles.fontSize);
      const weight = Number(styles.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      const ratio = contrast(flat, background);
      if (ratio >= need) {
        continue;
      }
      const key = `${element.tagName}|${styles.color}|${styles.fontSize}|${hex(background)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.contrast.push({
        tag: element.tagName.toLowerCase(),
        cls: String(element.className).slice(0, 60),
        size: styles.fontSize,
        weight,
        fg: hex(flat),
        bg: hex(background),
        ratio: Math.round(ratio * 100) / 100,
        need,
        text: (node.textContent ?? '').trim().slice(0, 44),
      });
    }
  }

  /* ---- 4. non-text contrast for control edges -------------------- */
  {
    const named = [
      ['.primary-control', 'primary button'],
      ['#theme-toggle', 'theme toggle'],
      ['footer', 'footer rule'],
    ];
    for (const [selector, label] of named) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) {
          continue;
        }
        const styles = getComputedStyle(element);
        const background = backdrop(element.parentElement ?? document.body);
        const width = styles.borderTopWidth;
        const color = parse(styles.borderTopColor);
        if (width === '0px' || color === null || color.alpha === 0) {
          continue;
        }
        const edge = color.alpha < 1 ? over(color.rgb, background, color.alpha) : color.rgb;
        const ratio = contrast(edge, background);
        if (ratio < 3) {
          out.ui.push({
            what: `${label} border`,
            edge: hex(edge),
            bg: hex(background),
            ratio: Math.round(ratio * 100) / 100,
            need: 3,
          });
        }
      }
    }
    for (const element of document.querySelectorAll('a, button, summary, [role="button"]')) {
      if (!visible(element) || clippedAway(element)) {
        continue;
      }
      const styles = getComputedStyle(element);
      const background = backdrop(element.parentElement ?? document.body);
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        const width = Number.parseFloat(styles[`border${side}Width`]);
        const color = parse(styles[`border${side}Color`]);
        if (!(width >= 1) || color === null || color.alpha === 0) {
          continue;
        }
        const edge = color.alpha < 1 ? over(color.rgb, background, color.alpha) : color.rgb;
        const ratio = contrast(edge, background);
        if (ratio < 3) {
          out.ui.push({
            what: `${element.tagName.toLowerCase()}.${side.toLowerCase()} border (interactive)`,
            edge: hex(edge),
            bg: hex(background),
            ratio: Math.round(ratio * 100) / 100,
            need: 3,
          });
        }
        break;
      }
    }
  }

  /* ---- 5. semantics --------------------------------------------- */
  {
    const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(visible)
      .map((heading) => ({
        level: Number(heading.tagName[1]),
        text: (heading.textContent ?? '').trim().slice(0, 48),
      }));
    let previous = 0;
    for (const heading of levels) {
      if (previous > 0 && heading.level > previous + 1) {
        out.semantics.push({
          kind: 'heading-skip',
          from: previous,
          to: heading.level,
          text: heading.text,
        });
      }
      previous = heading.level;
    }
    const h1s = levels.filter((heading) => heading.level === 1);
    if (h1s.length === 0) {
      out.semantics.push({ kind: 'no-h1' });
    } else if (h1s.length > 1) {
      out.semantics.push({ kind: 'multiple-h1', count: h1s.length, texts: h1s.map((h) => h.text) });
    }

    const ids = new Map();
    for (const element of document.querySelectorAll('[id]')) {
      ids.set(element.id, (ids.get(element.id) ?? 0) + 1);
    }
    for (const [id, count] of ids) {
      if (count > 1) {
        out.semantics.push({ kind: 'duplicate-id', id, count });
      }
    }

    for (const landmark of document.querySelectorAll(
      'nav, aside, section[aria-label], section[aria-labelledby], [role="region"]',
    )) {
      const name =
        landmark.getAttribute('aria-label') ??
        byId(landmark.getAttribute('aria-labelledby') ?? '')?.textContent?.trim();
      if (name === null || name === undefined || name.length === 0) {
        out.semantics.push({
          kind: 'unlabelled-landmark',
          tag: landmark.tagName.toLowerCase(),
          cls: String(landmark.className).slice(0, 50),
        });
      }
    }
  }

  /* ---- 6. accessible names and label-in-name --------------------- */
  {
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy !== null) {
        const text = labelledBy
          .split(/\s+/u)
          .map((id) => byId(id)?.textContent ?? '')
          .join(' ')
          .trim();
        if (text.length > 0) {
          return text;
        }
      }
      const aria = element.getAttribute('aria-label')?.trim();
      if (aria !== undefined && aria.length > 0) {
        return aria;
      }
      const text = (element.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
      if (text.length > 0) {
        return text;
      }
      return element.querySelector('img[alt]')?.alt ?? element.getAttribute('title')?.trim() ?? '';
    };

    for (const element of document.querySelectorAll(
      'a, button, summary, input, select, textarea',
    )) {
      if (!visible(element) || clippedAway(element)) {
        continue;
      }
      const name = accessibleName(element);
      if (name.length === 0) {
        out.names.push({
          tag: element.tagName.toLowerCase(),
          cls: String(element.className).slice(0, 60),
          href: element.getAttribute('href'),
          type: element.getAttribute('type'),
        });
        continue;
      }
      const visibleText = (element.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
      if (
        /^(next|previous|book home|contents|theme|skip to content)$/iu.test(name) &&
        visibleText.length > name.length + 2
      ) {
        out.names.push({
          kind: 'label-in-name',
          tag: element.tagName.toLowerCase(),
          name,
          visible: visibleText.slice(0, 60),
        });
      }
    }
  }

  /* ---- 7. aria references resolve ------------------------------- */
  {
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) {
      for (const element of document.querySelectorAll(`[${attribute}]`)) {
        for (const id of element.getAttribute(attribute).split(/\s+/u).filter(Boolean)) {
          if (byId(id) === null) {
            out.aria.push({
              attr: attribute,
              id,
              tag: element.tagName.toLowerCase(),
              cls: String(element.className).slice(0, 50),
            });
          }
        }
      }
    }
    for (const anchor of document.querySelectorAll('a[href^="#"]')) {
      const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
      if (id.length > 0 && byId(id) === null) {
        out.aria.push({ attr: 'href', id, tag: 'a', cls: String(anchor.className).slice(0, 50) });
      }
    }
  }

  return out;
};

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */
const slug = (route) =>
  route === '/' ? 'home' : route.replaceAll(/^\/|\/$/gu, '').replaceAll('/', '__');

/*
 * Refuse to sweep a base URL that is not actually serving the site.
 *
 * The env var is `PROBE_BASE_URL`, and a mistyped one silently falls back to the
 * default — which was the user's dev server on 4321 while its content cache was
 * invalid, returning the 404 page for every document. All 228 runs then measured
 * the error page and reported its borders and skip link as site findings, with a
 * `Failed to load resource: 404` on every run as the only hint. A sweep of the
 * wrong thing is worse than no sweep, so this is a hard stop.
 */
const assertServesTheSite = async () => {
  const probe = await fetch(`${BASE}/`, { redirect: 'follow' });
  const body = await probe.text();
  if (probe.status !== 200 || !body.includes('</html>')) {
    throw new Error(
      `${BASE} did not serve a page (status ${probe.status}). ` +
        'Point PROBE_BASE_URL at a built dist, e.g. ' +
        '`node test/support/static-server.mjs 4400` then ' +
        'PROBE_BASE_URL=http://localhost:4400 node test/probe/audit-sweep.mjs --shots',
    );
  }
  if (body.includes('404') && !body.includes('oracle') && body.length < 4000) {
    throw new Error(`${BASE}/ looks like it served the 404 page. Refusing to sweep.`);
  }
};

const report = { base: BASE, when: new Date().toISOString(), runs: [] };
const browser = await chromium.launch();

if (wantShots) {
  await mkdir(SHOT_DIR, { recursive: true });
}

/** Open one route in one viewport in one theme, audit it, and close cleanly. */
async function auditRoute(browser, { route, viewport, theme, vpName }) {
  const page = await browser.newPage({
    viewport,
    colorScheme: theme === 'light' ? 'light' : 'dark',
    deviceScaleFactor: 1,
  });
  const identity = { route, viewport: vpName, requestedTheme: theme };

  /*
   * Console and page errors are scoped to THIS navigation.
   *
   * They arrive asynchronously, and the page is reused across every run, so a
   * listener that only accumulates reports every error on whichever route happens
   * to be current when the message lands. That made one 404 on the intentional
   * `/404-probe/` route show up as a finding on all 38 pages. The array is cleared
   * immediately before each `goto`, and `/404-probe/` expects a 404 because it is
   * the deliberate probe for the error page — `dist` ships `404.html` and no
   * `/404-probe/` directory.
   */
  const consoleErrors = [];
  const pageErrors = [];
  const isProbe404 = route === '/404-probe/';
  page.on('console', (message) => {
    const type = message.type();
    if (type !== 'error' && type !== 'warning') {
      return;
    }
    /* A 404 for the probe route itself is the expected response, not a finding. */
    if (isProbe404 && message.text().includes('404')) {
      return;
    }
    consoleErrors.push(`${type}: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  try {
    await page.addInitScript((value) => {
      try {
        localStorage.setItem('theme', value);
      } catch {
        /* storage unavailable; the theme stays at its default */
      }
    }, theme);
    consoleErrors.length = 0;
    pageErrors.length = 0;
    const response = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);
    /* Let the transform-only title-block rise finish so a capture is at rest. */
    await page.waitForTimeout(900);

    const run = {
      ...identity,
      resolvedTheme: await page.evaluate(() => document.documentElement.dataset.theme),
      status: response?.status() ?? 0,
      ...(await page.evaluate(AUDIT, { touchMin: TOUCH_MIN - TOUCH_TOLERANCE })),
      consoleErrors: [...new Set(consoleErrors)].slice(0, 6),
      pageErrors: [...new Set(pageErrors)].slice(0, 4),
    };

    if (wantShots) {
      const name = `${slug(route)}__${vpName}__${theme}.png`;
      await page.screenshot({
        path: new URL(name, SHOT_DIR).pathname,
        fullPage: vpName === 'desktop',
      });
    }
    return run;
  } catch (error) {
    return { ...identity, error: String(error) };
  } finally {
    await page.close();
  }
}

await assertServesTheSite();

for (const [vpName, viewport] of viewports) {
  for (const theme of themeList) {
    for (const route of routes) {
      report.runs.push(await auditRoute(browser, { route, viewport, theme, vpName }));
    }
  }
}
await browser.close();

/* ---------------- triage digest ---------------- */
const length = (value) => value?.length ?? 0;

const offender = (run) =>
  Boolean(run.error) ||
  length(run.consoleErrors) > 0 ||
  length(run.pageErrors) > 0 ||
  length(run.overflow?.escapes) > 0 ||
  (run.overflow?.scrollW ?? 0) > (run.overflow?.clientW ?? 0) + 1 ||
  length(run.targets) > 0 ||
  length(run.contrast) > 0 ||
  length(run.ui) > 0 ||
  length(run.semantics) > 0 ||
  length(run.names) > 0 ||
  length(run.aria) > 0 ||
  run.resolvedTheme !== run.requestedTheme;

const offenders = report.runs.filter(offender);

console.log(`\n=== ${report.runs.length} runs, ${offenders.length} with findings ===\n`);

for (const run of offenders) {
  const bits = [`${run.viewport}/${run.requestedTheme}`];
  if (run.error) {
    bits.push(`ERROR ${run.error}`);
  }
  if (run.resolvedTheme !== run.requestedTheme) {
    bits.push(`theme=${run.resolvedTheme}`);
  }
  for (const error of run.consoleErrors ?? []) {
    bits.push(`console=${error}`);
  }
  for (const error of run.pageErrors ?? []) {
    bits.push(`pageerror=${error}`);
  }
  console.log(`\n### ${run.route}  [${bits.join(' ')}]`);

  if (run.overflow) {
    console.log(
      `  overflow: client=${run.overflow.clientW} scroll=${run.overflow.scrollW} escapes=${run.overflow.escapes.length}`,
    );
    for (const escape of run.overflow.escapes) {
      console.log(
        `     ! <${escape.tag}> right=${escape.right} w=${escape.width} "${escape.text}" .${escape.cls}`,
      );
    }
  }
  for (const target of (run.targets ?? []).slice(0, 8)) {
    console.log(
      `  target: <${target.tag}> ${target.width}x${target.height} "${target.text}" .${target.cls}`,
    );
  }
  for (const item of run.contrast ?? []) {
    console.log(
      `  contrast: ${item.ratio}:1 (need ${item.need}) ${item.size}/${item.weight} ${item.fg} on ${item.bg} <${item.tag}> "${item.text}" .${item.cls}`,
    );
  }
  for (const item of run.ui ?? []) {
    console.log(`  ui-contrast: ${item.ratio}:1 (need 3) ${item.what} ${item.edge} on ${item.bg}`);
  }
  for (const item of run.semantics ?? []) {
    console.log(`  semantics: ${JSON.stringify(item)}`);
  }
  for (const item of run.names ?? []) {
    console.log(`  name: ${JSON.stringify(item)}`);
  }
  for (const item of run.aria ?? []) {
    console.log(`  aria: ${item.attr} -> #${item.id} MISSING on <${item.tag}> .${item.cls}`);
  }
}

await writeFile(REPORT, JSON.stringify(report, null, 2));
console.log(`\nfull report: test/probe/__audit-sweep.json`);
