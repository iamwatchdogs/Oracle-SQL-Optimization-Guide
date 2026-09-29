import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import { resolveBase } from '../../src/lib/site.mjs';

const contentsRoot = new URL('../../contents/', import.meta.url).pathname;

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return nested.flat();
};

const notebookFiles = async () =>
  (await walk(contentsRoot)).filter((file) => /\.mdx?$/u.test(file)).toSorted();

const loadSources = async () =>
  Promise.all(
    (await notebookFiles()).map(async (file) => ({
      file: file.replace(contentsRoot, ''),
      markdown: await readFile(file, 'utf8'),
    })),
  );

/** Fenced code is the author's example, not a link the reader can follow. */
const withoutFences = (markdown) =>
  markdown.replaceAll(/^([ \t]*)(```|~~~)[\s\S]*?^\1\2.*$/gmu, '');

const INLINE_CODE = /`[^`\n]*`/gu;
const MARKDOWN_LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

const rootRelativeLinks = (markdown) => {
  const bare = withoutFences(markdown).replaceAll(INLINE_CODE, ' ');
  const targets = [...bare.matchAll(MARKDOWN_LINK)].map((match) => match[1]);

  return targets.filter(
    (href) => href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/#'),
  );
};

/**
 * The corpus's cross-references are the book's navigation, and the only thing that
 * makes them work is `rehypeBaseLinks` prefixing them at render time.
 *
 * This asserts the property from the source side, which is where a regression
 * would actually be introduced: a document written as `](/04-recipes/…)` is
 * correct today, and a document written as the full prefixed path would quietly
 * become a double prefix. Both directions are wrong in different ways and only
 * one of them fails visibly in a browser.
 */
test('every internal cross-reference is written as a bare route', async () => {
  const documents = await loadSources();
  const offenders = documents.flatMap(({ file, markdown }) =>
    rootRelativeLinks(markdown)
      .filter((href) => {
        const base = resolveBase();
        return base !== '' && (href === base || href.startsWith(`${base}/`));
      })
      .map((href) => `${file} → ${href}`),
  );

  expect(offenders).toEqual([]);
});

test('the corpus really does carry internal cross-references to lose', async () => {
  /*
   * The assertion above is only meaningful if there is something for it to check.
   * A corpus of unlinked documents would pass it by having no links at all, and
   * the transform would look covered while covering nothing.
   */
  const documents = await loadSources();
  const total = documents.reduce(
    (sum, { markdown }) => sum + rootRelativeLinks(markdown).length,
    0,
  );

  expect(total).toBeGreaterThan(500);
});
