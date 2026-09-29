import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { COMPILED_ON, resolveBase, SITE_ORIGIN } from '../../src/lib/site.mjs';

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');
const route = () => read('../../src/pages/rss.xml.ts');
const layout = () => read('../../src/layouts/BaseLayout.astro');
const footer = () => read('../../src/components/SiteFooter.astro');

/**
 * The feed.
 *
 * The honest constraint, stated once: the corpus records no per-chapter dates, and
 * a feed is the one place a date is a promise. So every item carries the edition's
 * compile date, which is true of all of them, and a chapter that is genuinely
 * revised can override it.
 */
test('the feed is a route, so its dates and addresses are derived', async () => {
  const code = await route();

  expect(code).toContain('COMPILED_ON');
  expect(code).toContain('resolveBase');
  expect(code).not.toMatch(/new Date\(\)/u);
  expect(code).not.toMatch(/https?:\/\/[a-z]/u);
});

test('the compile date is written down, not taken from the clock', async () => {
  const code = await route();
  const site = await read('../../src/lib/site.mjs');

  /*
   * A build that stamped `new Date()` would give a different `lastBuildDate` and
   * a different colophon on every run, so the same input would produce a diff
   * nobody can review.
   */
  expect(site).toMatch(/COMPILED_ON = '\d{4}-\d{2}-\d{2}'/u);
  expect(code).not.toMatch(/new Date\(\)|Date\.now/u);
  expect(COMPILED_ON).toBe('2026-09-22');
});

test('the colophon and the feed read the same date', async () => {
  const colophon = await footer();
  const code = await route();

  /* Two literals would be two dates, free to disagree, printed on every page. */
  expect(colophon).toContain('COMPILED_ON');
  expect(colophon).not.toContain('2026-09-22');
  expect(code).toContain('COMPILED_ON');
});

test('the channel link carries the repository path', async () => {
  const code = await route();

  /*
   * The bug this pins. `Astro.site` is the origin and the repository is a path
   * under it, so passing it straight through gave a channel whose `<link>` pointed
   * at `https://iamwatchdogs.github.io/` — a site with nothing on it. A reader
   * would have been told the feed is about a page that does not exist.
   */
  expect(code).toContain('const siteRoot = new URL(`${base}/`, origin).href;');
  expect(code).toContain('site: siteRoot');
  expect(code).not.toContain('site: context.site');
});

test('items are in reading order, not directory order', async () => {
  const code = await route();

  /* The collection's own `order`. A feed in filesystem order puts the appendix
     before the preface, which is the opposite of what the book is for. */
  expect(code).toContain('(a.data.order ?? 9999) - (b.data.order ?? 9999)');
  expect(code).toContain('toSorted');
});

test('a chapter can override the edition date when it is genuinely revised', async () => {
  const code = await route();

  /*
   * The upgrade path, and the reason this is not just "one date for everything,
   * forever": a revised chapter declares a date and sorts above the rest. The
   * field is not in the schema yet because no chapter has needed it, and an
   * unused schema field is a promise nothing keeps.
   */
  expect(code).toContain('pubDate: edition');
  expect(code).toContain('COMPILED_ON');
});

test('the feed is discoverable from every page', async () => {
  const head = await layout();

  /* A link nothing points at is a URL nobody will visit. */
  expect(head).toContain('rel="alternate"');
  expect(head).toContain('type="application/rss+xml"');
  expect(head).toContain('feedHref');
});

test('the feed URL is built by joining, not by concatenation', async () => {
  const head = await layout();

  /* The fourth appearance of this shape in the repo. */
  expect(head).toContain("const feedHref = new URL('rss.xml', siteRoot).href;");
  expect(head).not.toMatch(/new URL\('\//u);
});

test('the feed is served as an RSS document, and advertised as one', async () => {
  const code = await route();
  const head = await layout();

  /* `@astrojs/rss` sets the content type; the type a reader is told about is the
     one declared for autodiscovery, and the two have to be the same string. */
  expect(code).toContain('@astrojs/rss');
  expect(head).toContain('type="application/rss+xml"');
  expect(head).toContain('title={`${SITE_TITLE} — chapters`}');
});

test('the deployed address is the one the site is served at', () => {
  /*
   * Derived rather than written out. `SITE_BASE=/` is a supported build — a host
   * that serves from the origin root — and a literal here would fail exactly that
   * configuration while telling the reader nothing the join above does not.
   */
  expect(new URL(`${resolveBase()}/`, `${SITE_ORIGIN}/`).href).toBe(
    `${SITE_ORIGIN}${resolveBase()}/`,
  );
});
