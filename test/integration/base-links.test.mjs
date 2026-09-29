import { expect, test } from 'vitest';
import { unified } from '@astrojs/markdown-remark';
import { rehypeBaseLinks } from '../../src/lib/rehype-base-links.mjs';
import { rehypeDisclosures } from '../../src/lib/rehype-disclosures.mjs';
import { resolveBase } from '../../src/lib/site.mjs';

/*
 * The deployment prefix reaches the prose through the renderer, not through the
 * documents. 618 links across the corpus are written as `](/…)`; if that ever
 * stops resolving, every cross-reference in the book 404s and no source file
 * changed to cause it.
 *
 * The base here is a placeholder rather than the real repository name on
 * purpose: the markdown parser percent-encodes a non-ASCII path, which turned an
 * idempotence assertion into a test of percent-encoding rather than of prefixes.
 */
const BASE = '/book';

/*
 * `bind`, not a call. `rehypeBaseLinks({ base })` is the transformer, and unified
 * would treat that as a plugin and invoke it again with no tree — the walk then
 * throws on `undefined`, naming neither the plugin nor the mistake.
 */
const renderWith = async (markdown, rehypePlugins) => {
  const renderer = await unified({ rehypePlugins }).createRenderer({});
  return (await renderer.render(markdown, {})).code;
};

const renderWithBase = (markdown, base) =>
  renderWith(markdown, [rehypeBaseLinks.bind(null, { base })]);

test('a root-relative link takes the deployment prefix', async () => {
  const code = await renderWithBase('[STS](/04-recipes/01-freeze-with-sts/)', BASE);

  expect(code).toContain('href="/book/04-recipes/01-freeze-with-sts/"');
});

test('a prefix already applied is not applied twice', async () => {
  const code = await renderWithBase('[a](/book/x/)', BASE);

  expect(code).toContain('href="/book/x/"');
  expect(code).not.toContain('/book/book');
});

test('a link to the site root keeps its trailing slash under the prefix', async () => {
  /* `trailingSlash: 'always'`, so the home page is `/book/` and not `/book`. */
  const code = await renderWithBase('[home](/)', BASE);

  expect(code).toContain('href="/book/"');
});

test('a fragment link is prefixed too, so it stays within the site', async () => {
  const code = await renderWithBase('[key](/#evidence-key)', BASE);

  expect(code).toContain('href="/book/#evidence-key"');
});

test('absolute, protocol-relative, fragment and mail links are left alone', async () => {
  /*
   * The corpus is full of links to Oracle's own documentation. A transform that
   * could not tell a whole URL from a route would mangle every one of them, which
   * is a worse outcome than a missing prefix.
   */
  const code = await renderWithBase(
    [
      '[a](https://docs.oracle.com/)',
      '[b](//example.com/x)',
      '[c](#section)',
      '[d](mailto:someone@example.com)',
    ].join(' '),
    BASE,
  );

  expect(code).toContain('href="https://docs.oracle.com/"');
  expect(code).toContain('href="//example.com/x"');
  expect(code).toContain('href="#section"');
  expect(code).toContain('href="mailto:someone@example.com"');
  expect(code).not.toContain('/book');
});

test('an empty or root-only base prefixes nothing', async () => {
  /* What a deploy target serving from the origin root would build. */
  const codes = await Promise.all(['', '/'].map((base) => renderWithBase('[a](/x/)', base)));

  for (const code of codes) {
    expect(code).toContain('href="/x/"');
  }
});

test('an omitted base falls back to the one this build was made for', async () => {
  /*
   * Not the same as empty: no option means "ask the config". The expected value is
   * the configured base rather than a literal, because `SITE_BASE=/` is a
   * supported build — and an assertion that hard-codes the repository name would
   * fail the configuration the README documents.
   */
  const base = resolveBase();
  const code = await renderWith('[a](/x/)', [rehypeBaseLinks]);

  expect(code).toBe(`<p><a href="${base}/x/">a</a></p>`);
});

test('a base written without a leading slash, or with a trailing one, still works', async () => {
  const codes = await Promise.all(
    ['book', '/book/'].map((base) => renderWithBase('[a](/x/)', base)),
  );

  for (const code of codes) {
    expect(code).toContain('href="/book/x/"');
  }
});

test('the prefix reaches links nested in tables, lists and blockquotes', async () => {
  const code = await renderWithBase(
    [
      '| Tool | Use |',
      '|---|---|',
      '| [SPA](/04-recipes/02-before-after-with-spa/) | before/after |',
      '',
      '- [STS](/04-recipes/01-freeze-with-sts/)',
      '',
      '> [STS guidance](/03-toolbox/02-freeze-work-with-sts/)',
    ].join('\n'),
    BASE,
  );

  for (const page of [
    '/04-recipes/02-before-after-with-spa/',
    '/04-recipes/01-freeze-with-sts/',
    '/03-toolbox/02-freeze-work-with-sts/',
  ]) {
    expect(code).toContain(`href="/book${page}"`);
  }
});

test('a link authored as raw HTML inside a disclosure is left to Astro, not prefixed', async () => {
  /*
   * Recorded as a limitation rather than fixed. A raw `<a>` arrives as an opaque
   * `raw` node, and Astro's own mandatory raw pass — which is what turns it into
   * a real anchor — runs after every project plugin. A rehype transform cannot
   * see a link that has not been parsed yet, and adding a second raw pass to get
   * ahead of it would undo the constraint the corpus test holds this project to.
   *
   * The corpus contains no raw HTML anchors, so nothing shipped depends on this.
   * If a document ever does, the fix is to write it as a markdown link.
   */
  const code = await renderWith(
    ['<details><summary>Raw</summary>', '', '<a href="/x/">raw html</a>', '', '</details>'].join(
      '\n',
    ),
    [rehypeDisclosures, rehypeBaseLinks.bind(null, { base: BASE })],
  );

  /* The prefix is not applied, and the renderer is still well-formed. */
  expect(code).toContain('href="/x/"');
});
