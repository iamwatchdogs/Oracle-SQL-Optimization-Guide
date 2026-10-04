/*
 * What a browser did with the fonts on one cold load.
 *
 * The reader half of `test/e2e/font-preload.spec.mjs`, separated for the reason every other file in
 * `test/e2e/support/` is separated: a spec that has to build a page's font inventory before it can make a point
 * is a spec whose failure message is a stack trace from the middle of the claim. These read; the spec asserts.
 *
 * THE PAGE REPORTS RAW NAMES; THIS MODULE DECIDES THE SPELLING. Every family the provider hands back carries a
 * content hash — `Source Serif 4-2241a5b85ee54f8f` today — so the page reports `{ family, style }` exactly as
 * `getComputedStyle` and `document.fonts` give them, and the mapping to `serif` / `sans` / `mono` happens once
 * here against the page's own `--face-*` custom properties. A spec that hard-coded a hashed family would go red
 * on the next font bump and teach the next reader to update it; one that hard-coded `serif` would be reading
 * something the browser never said.
 *
 * EVERY READ IS ITS OWN `page.evaluate`. `page.evaluate` serialises the function it is given and runs it with no
 * access to module scope, so a helper shared between two reads has to live inside one of them — which makes each
 * read a wall of lines. Five small reads cost one extra round trip to a page that has already finished loading,
 * and keep every assertion's failure message about the browser rather than about a helper.
 *
 * Nothing here is read from Playwright's request events: the claims are about what the browser CONCLUDED.
 */
import { DESKTOP, MOBILE } from './viewports.mjs';

/**
 * The faces the first viewport needs, as `(family, style)` — never as a hash.
 *
 * In SORTED order, because it is compared against a sorted list of keys read out of the page and two
 * hand-kept parallel orderings are exactly what passes until somebody retypes one of them.
 */
export const FIRST_VIEWPORT_FACES = ['mono|normal', 'sans|normal', 'serif|normal'];

/**
 * The two faces that MAY also paint inside the first viewport, and why they are not preloaded.
 *
 * Measured across all 37 content pages at 1280x900 and 390x844, the italic serif face lands inside the first
 * viewport on 7 of them and not on the other 30 — the conclusion card at `src/styles/global.css:1202-1211`
 * sits just under the fold on most pages and inside it on a handful. So "the first viewport paints in exactly
 * three faces" is FALSE, and the spec asserts the truth instead: the three are always there, these two may
 * join them, and nothing else may.
 *
 * `mono|italic` is here for a reason not visible in the name. JetBrains Mono is configured
 * `styles: ['normal']`, so there is no italic FILE — a `<code>` span inside the italic card inherits
 * `font-style: italic` and the browser SYNTHESISISES an oblique from the upright file. It costs no extra
 * request and is deliberately not preloaded; the `EVERY_FACE` assertion is what pins that, by failing if a
 * fifth `@font-face` ever appears to serve it.
 */
export const OPTIONAL_FIRST_VIEWPORT_FACES = ['mono|italic', 'serif|italic'];

/**
 * Every face the site ships, in the same `family|style` spelling.
 *
 * Asserted against the page's own `@font-face` table so that "exactly three of the four are preloaded" is a
 * statement about the WHOLE font budget: a future `<Font>` adding a fifth face cannot hide inside a count.
 */
export const EVERY_FACE = [...FIRST_VIEWPORT_FACES, 'serif|italic'].toSorted();

/**
 * Engines whose Resource Timing can say HOW a font request was discovered.
 *
 * `initiatorType` is the discriminator the preload specs are built on, and it is not portable. Chromium and
 * WebKit report `link` for a request the parser resolved from a `<link rel="preload">` and `css` for one the
 * CSSOM resolved from an `@font-face`. Gecko reports `other` for BOTH — measured here rather than assumed: a
 * cold load in Firefox returned eleven resource entries for four files and every one read `other`, so on that
 * engine the value carries no information and asserting it would be asserting a constant.
 *
 * The cost of that is paid in one place — three tests skip on Firefox — rather than spread across four
 * engines in assertions nobody believes.
 */
export const reportsInitiator = (browserName) => browserName !== 'firefox';

/** The cold loads the preload specs drive, as `route`/`viewport` PAIRS rather than two parallel lists, because
 *  the specs filter by viewport and two lists to keep in step is what drifts. */
export const COLD_LOADS = Object.freeze(
  ['/', '/00-preface/', '/00-preface/01-why-evidence-grades/'].flatMap((route) =>
    [DESKTOP, MOBILE].map((viewport) => Object.freeze({ route, viewport })),
  ),
);
export { DESKTOP, MOBILE };

/** A cold load at a viewport: the page's own account of its fonts, plus a label naming the pair.
 *
 *  `waitUntil: 'load'`, deliberately against the grain of the two sibling CSS specs, which wait for
 *  `domcontentloaded` because they are about markup: this one is about the network, so it waits for the network to
 *  be quiet once. Nothing between here and the assertions is a measurement, so this cannot turn a result into a
 *  race — it removes the only window in which a request could still be in flight when the facts are read.
 */
export const coldLoad = async (page, route, viewport) => {
  await page.setViewportSize(viewport);
  await page.goto(route, { waitUntil: 'load' });
  const roles = await page.evaluate(faceRoles);
  const [preloaded, faceOfFile, fetched, above, loaded] = await Promise.all([
    page.evaluate(preloadLinks),
    page.evaluate(faceTable),
    page.evaluate(fontRequests),
    page.evaluate(facesInFirstViewport),
    page.evaluate(loadedFaces),
  ]);

  const key = roleKey(roles);
  return {
    where: `${route} at ${viewport.width}px`,
    preloaded,
    faceOfFile: new Map(Object.entries(faceOfFile).map(([file, face]) => [file, key(face)])),
    fetched,
    above: countFacesIn(above, key),
    loaded: loaded.map((face) => key(face)),
  };
};

/** Fold the per-element records the page returned into `face` to element counts. Done here rather than in the
 *  page because two faces of one family — `Source Serif 4-…|normal` and `…|italic` — share a family name, and
 *  grouping by a concatenated string in the browser would need the string split again to be reported. */
const countFacesIn = (records, key) => {
  const counts = new Map();
  for (const record of records) {
    const face = key(record);
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return counts;
};

/** `file=initiatorType` for every font transferred, for a failure message that has to be diagnostic. */
export const timeline = (facts) =>
  facts.fetched.map((entry) => `${entry.file}:${entry.initiatorType}`).join(', ');

/** The request that carried `face` to the page, or `undefined` if the browser never transferred its file. */
export const requestFor = (facts, face) =>
  facts.fetched.find((entry) => facts.faceOfFile.get(entry.file) === face);

/** The `(family, style)` pairs the first viewport paints in that this module does not know about. */
export const unaccountedFaces = (facts) =>
  [...facts.above.keys()]
    .filter((face) => !FIRST_VIEWPORT_FACES.includes(face))
    .filter((face) => !OPTIONAL_FIRST_VIEWPORT_FACES.includes(face))
    .toSorted();

/** The faces a page preloads, as `(face, style)` keys, resolved through its own `@font-face` table. A `Map`
 *  lookup and not a property read, because `faceOfFile` is a `Map` in the facts: bracket access on a Map is
 *  `undefined` for every key, which reads as a list of `undefined` rather than as a type error. */
export const preloadedFaces = (facts) =>
  [
    ...new Set(
      facts.fetched
        .filter((entry) => entry.initiatorType === 'link')
        .map((entry) => facts.faceOfFile.get(entry.file)),
    ),
  ].toSorted();

/** The running head's own computed family, style and position. Read rather than written down, so "the running
 *  head paints in mono" is a claim about this layout's markup and not about a selector typed here. */
export const readWordmark = (page) =>
  page.evaluate(() => {
    const element = document.querySelector('header .running-head');
    if (element === null) {
      return null;
    }
    const style = getComputedStyle(element);
    return {
      family: style.fontFamily,
      style: style.fontStyle,
      top: element.getBoundingClientRect().top,
      height: window.innerHeight,
    };
  });

/**
 * The self-hosted family each `--face-*` variable names, read off the page's root.
 *
 * Only the FIRST name of each, and matched by PREFIX further down: Astro's metric-adjusted local faces —
 * `Source Serif 4-… fallback: Times New Roman` — share the self-hosted family's stem, and they appear in
 * `document.fonts`, so a strict equality match would report a face the reader can plainly see as unknown.
 */
const faceRoles = () => {
  const root = getComputedStyle(document.documentElement);
  const first = (family) =>
    family
      .split(',')[0]
      .trim()
      .replaceAll(/^["']|["']$/gu, '');

  return ['serif', 'sans', 'mono']
    .map((role) => [first(root.getPropertyValue(`--face-${role}`)), role])
    .filter(([stem]) => stem.length > 0);
};

/** Turn one of the page's `{ family, style }` records into this repository's `role|style` spelling. */
const roleKey =
  (roles) =>
  ({ family, style }) => {
    for (const [stem, role] of roles) {
      if (family === stem || family.startsWith(`${stem} `)) {
        return `${role}|${style || 'normal'}`;
      }
    }
    return `${family}|${style || 'normal'}`;
  };

/** The font files the `<head>` preloads, and whether each carries `crossorigin`. */
const preloadLinks = () =>
  [...document.head.querySelectorAll('link[rel="preload"][as="font"]')].map((link) => ({
    file: new URL(link.href, location.href).pathname.split('/').pop(),
    crossorigin: link.hasAttribute('crossorigin'),
  }));

/**
 * File name to the face that serves it, from the document's own `@font-face` rules.
 *
 * Through the CSSOM rather than by reading the page's `<style>` text, because these are the rules the CSSOM
 * accepted — the ones `document.fonts` was built from — rather than the ones a parser could read. `cssRules` is
 * reachable on every sheet because the CSS is inlined (`inlineStylesheets: 'always'`) and because the page is
 * same-origin with itself either way; a `SecurityError` on an exotic sheet is skipped rather than thrown, since a
 * face declared somewhere unreadable is not one this page can paint with.
 */
const faceTable = () => {
  const table = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      // `rule.type` is deprecated (ts(6385)) and `CSSRule.FONT_FACE_RULE` is the constant that
      // deprecation is about; the constructor says the same thing and survives the alias being dropped.
      if (!(rule instanceof CSSFontFaceRule)) {
        continue;
      }
      const url = /url\(\s*"?([^")]+)"?\s*\)/u.exec(rule.style.getPropertyValue('src'))?.[1];
      if (url !== undefined) {
        const family = rule.style.getPropertyValue('font-family').split(',')[0].trim();
        table[new URL(url, location.href).pathname.split('/').pop()] = {
          // Quotes stripped HERE, not by a shared helper, because a `page.evaluate` body has no module scope
          // to call one from — and it has to be stripped: the CSSOM quotes `"Source Serif 4-…"` while
          // `--face-sans` reports `Inter-86155b4f3141ff2c` unquoted, so a join comparing the two forms matches
          // nothing and every face in a failure reads as unknown.
          family: family.replaceAll(/^["']|["']$/gu, ''),
          style: rule.style.getPropertyValue('font-style') || 'normal',
        };
      }
    }
  }
  return table;
};

/** Every `.woff2` the page transferred, with the `initiatorType` that says who asked for it. */
const fontRequests = () =>
  performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes('.woff2'))
    .map((entry) => ({
      file: new URL(entry.name).pathname.split('/').pop(),
      initiatorType: entry.initiatorType,
    }));

const facesInFirstViewport = () => {
  const faces = [];
  for (const element of document.body.querySelectorAll('*')) {
    const text = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join('');
    const box = element.getBoundingClientRect();
    if (text.length === 0 || box.width === 0 || box.height === 0) {
      continue;
    }
    if (box.top >= window.innerHeight || box.bottom <= 0) {
      continue;
    }
    const style = getComputedStyle(element);
    faces.push({
      family: style.fontFamily
        .split(',')[0]
        .trim()
        .replaceAll(/^["']|["']$/gu, ''),
      style: style.fontStyle,
    });
  }
  return faces;
};

/**
 * The faces `document.fonts` reports as loaded, once the font loading queue has settled.
 *
 * Quotes stripped for the reason given in `faceTable`: `document.fonts` reports `"JetBrains Mono-f4cdf5dcfa46f080"`
 * while `--face-mono` reports the same name unquoted, and a list that keeps its quotes matches no role and reads
 * as though the face never arrived.
 */
const loadedFaces = async () => {
  await document.fonts.ready;
  return [...document.fonts]
    .filter((face) => face.status === 'loaded')
    .map((face) => ({
      family: face.family
        .split(',')[0]
        .trim()
        .replaceAll(/^["']|["']$/gu, ''),
      style: face.style,
    }));
};
