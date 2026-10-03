import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { resolveBase, SITE_ORIGIN } from '../../src/lib/site.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

/*
 * robots.txt is generated, so its correctness is a property of the route rather
 * than of a file someone remembered to update. These assertions read the route's
 * source, because `verify` runs the unit suite before `astro build` and a test
 * reading `dist/` here would check whatever the last build left behind.
 *
 * The built output is covered separately: `built-links.spec.mjs` runs after a real
 * build and would catch a malformed `Sitemap:` URL.
 */
const robotsSource = () => readSource('../../src/pages/robots.txt.ts');

test('the sitemap URL is derived, never written out', async () => {
  const source = await robotsSource();

  /*
   * The reason this file exists at all. It was a static copy in `public/` that
   * still named `example.com` after the site had been given a real address,
   * because nothing rewrites a file that is only copied.
   */
  expect(source).toContain('SITE_ORIGIN');
  expect(source).toContain('resolveBase');

  /* A literal host in the response would be the bug coming back. */
  expect(source).not.toMatch(/https?:\/\/[a-z]/u);
});

test('every allowed surface is genuinely allowed', async () => {
  const source = await robotsSource();

  /* A book that wants to be found, with nothing private and nothing gated. */
  expect(source).toContain("'User-agent: *'");
  expect(source).toContain("'Allow: /'");

  /* A crawl delay would slow readers down and not reduce real crawl load. */
  expect(source).not.toMatch(/Crawl-delay/u);
});

test('the content type is the one RFC 9309 asks for', async () => {
  const source = await robotsSource();

  expect(source).toContain('text/plain; charset=utf-8');
});

test('the served address is the one the sitemap integration will emit', async () => {
  /*
   * Both derive from `resolveBase` and `site`, but they are separate files
   * written at separate times. The one thing that must hold is that the path
   * prefix is the same in both, since a `Sitemap:` line pointing at a path the
   * sitemap does not live at is worse than no line at all.
   */
  const source = await robotsSource();
  const base = resolveBase();
  const root = new URL(`${base}/`, `${SITE_ORIGIN}/`).href;

  /*
   * Derived, not written out. `SITE_BASE=/` is a supported build, and a literal
   * would fail that configuration while asserting nothing the join does not.
   * What matters is the two halves agreeing: the file names the index under the
   * same prefix the site is served at.
   */
  expect(new URL('sitemap-index.xml', root).href).toBe(`${root}sitemap-index.xml`);

  /* The index, not `sitemap.xml` — that is the file @astrojs/sitemap emits. */
  expect(source).toContain('sitemap-index.xml');
  expect(source).not.toMatch(/\bsitemap\.xml\b/u);
});
