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

test('every item carries the edition date, and nothing claims otherwise', async () => {
  const code = await route();

  /*
   * What the corpus can honestly support. The corpus records no per-chapter dates,
   * and a feed is the one place a date is a promise, so one date for the edition
   * is true of all thirty-seven items.
   */
  expect(code).toContain('pubDate: edition');
  expect(code).toContain('COMPILED_ON');

  /* No invented per-chapter date, and no promise of one the code does not honour. */
  expect(code).not.toMatch(/pubDate: (new Date|Date\.now)/u);

  /* The docstring names the field; the code must not read it. */
  const statements = code.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/\/\/.*$/gmu, '');
  expect(statements).not.toMatch(/entry\.data\.date/u);
});

test('the revision path is documented as the one that is not wired yet', async () => {
  const code = await route();
  const schema = await read('../../src/content.config.ts');

  /*
   * `entry.data.date` is the way out, and the schema does not accept it yet —
   * which is deliberate. No chapter has been revised, and a schema field nothing
   * sets is a promise nothing keeps. The two are asserted together so the comment
   * and the schema cannot drift apart: the day the field is added, this fails and
   * says so, rather than the comment quietly promising a capability that is gone.
   */
  expect(code).toContain('entry.data.date');
  expect(schema).not.toMatch(/date:/u);
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

  /*
   * `@astrojs/rss` serves the document as `application/xml`, which is correct for
   * a `.xml` URL and is what GitHub Pages sends regardless. Autodiscovery declares
   * the more specific `application/rss+xml`, which is the type the format is
   * registered as. The two are not the same string and do not need to be: one is
   * what the server sends, the other is what the format is.
   */
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
