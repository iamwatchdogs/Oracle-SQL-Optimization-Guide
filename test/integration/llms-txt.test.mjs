import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const source = () => readSource('../../src/pages/llms.txt.ts');

/**
 * The shape the llmstxt.org v2 spec requires, in the order it requires it.
 *
 * This file is generated, so what matters is that the generator emits the
 * required structure. The assertions read the route's source rather than `dist/`
 * because `verify` runs the unit suite before `astro build`.
 */
test('the file opens with an H1 and a blockquote summary', async () => {
  const code = await source();

  /* The H1 is the only required section; the blockquote is what makes the rest
     interpretable, and an index without one is a list of links with no frame. */
  expect(code).toContain('`# ${SITE_TITLE}`');
  expect(code).toContain('`> ${SITE_DESCRIPTION}`');
  expect(code).not.toMatch(/SITE_TITLE\s*=\s*'Oracle SQL Optimization for Junior Devs'/u);
});

test('section headings come from the corpus, not from a table here', async () => {
  const code = await source();

  /*
   * The failure this prevents is a third copy of the section names, free to fall
   * behind the two that already render on the page. Reading the index page's own
   * frontmatter makes the file wrong only when the book is.
   */
  expect(code).toContain('sections.find');
  expect(code).not.toMatch(/00-preface['"]/u);
  expect(code).not.toMatch(/SECTION_TITLES/u);
});

test('every entry carries a description when the page has one', async () => {
  const code = await source();

  /* The reason the file exists: an agent picks a page from what it says, not from
     its title. A bare link list would make it fetch all 37 to choose one. */
  expect(code).toContain('page.description');
  expect(code).toContain('page.description ? `- ${link}: ${page.description}` : `- ${link}`');
});

test('links are absolute and carry the deployment prefix', async () => {
  const code = await source();

  expect(code).toContain('SITE_ORIGIN');
  expect(code).toContain('resolveBase');
  expect(code).not.toMatch(/https?:\/\/[a-z]/u);
});

test('a route is joined without a leading slash', async () => {
  const code = await source();

  /*
   * The bug this pins. `new URL('/00-preface/', 'https://host/Oracle-…/')`
   * resolves the rooted path against the origin and throws the prefix away — the
   * same trap as `page.goto('/x/')` under a `baseURL` with a path, and it fails the
   * same way: the build succeeds, every link is wrong, and nothing complains
   * until something follows one.
   */
  expect(code).not.toMatch(/`\/\$\{page\.route\}/u);
  expect(code).toContain('`${page.route}/`');
});

test('the file is served as markdown', async () => {
  const code = await source();

  expect(code).toContain('text/markdown; charset=utf-8');
});

test('it points at the source and the sitemap', async () => {
  const code = await source();

  /* Where the text actually is, and the other machine-readable index. */
  expect(code).toContain('REPO_URL');
  expect(code).toContain('sitemap-index.xml');
});

test('the file argues for nothing', async () => {
  /*
   * An agent deciding where to look cannot be persuaded by self-description, and a
   * file that argues for itself is one the agent has to learn to discount. The
   * prose describes the book and where the text is; it does not advocate.
   *
   * Read from the route's source, and only the literals it hands to the response.
   * An earlier draft read the built file instead, which broke on a clean runner:
   * `verify` runs the unit suite before `astro build`, so `dist/` is not there yet.
   * The built output is checked by `built-links.spec.mjs`, which runs after a real
   * build. Matching on the source is deliberately narrow — it can be fooled by a
   * comment — so it is paired with a check that the same strings are what the
   * generator assembles.
   */
  const code = await source();
  const quoted = [...code.matchAll(/'(?:[^'\\]|\\.)*'/gu)].map((match) => match[0]);

  expect(quoted.length).toBeGreaterThan(10);
  for (const line of quoted) {
    expect(line, `advocacy in an emitted line: ${line}`).not.toMatch(
      /you should|must read|don'?t miss|essential reading|sign up|subscribe|newsletter/iu,
    );
  }
});
