import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { resolveBase } from '../../src/lib/site.mjs';

const distRoot = new URL('../../dist/', import.meta.url).pathname;

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

const loadPages = async () => {
  const files = (await walk(distRoot)).filter((file) => file.endsWith('.html')).toSorted();
  return Promise.all(
    files.map(async (file) => ({
      file: file.replace(distRoot, ''),
      html: await readFile(file, 'utf8'),
    })),
  );
};

/** Attribute values only, so a path inside prose or a code sample cannot match. */
const attributesOf = (html, name) =>
  [...html.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'gu'))].map((match) => match[1]);

const isInternal = (href) => href.startsWith('/') && !href.startsWith('//');

/**
 * The guarantee the rest of this suite deliberately does not make.
 *
 * The static server answers both `/00-preface/` and `/<base>/00-preface/`, so the
 * specs can drive the site by the routes the book is written in without
 * restating the repository name in 144 `page.goto` calls. That leniency means a
 * link rendered without its prefix resolves here and 404s on GitHub Pages, where
 * the site exists only under the repository path.
 *
 * So this reads the built HTML rather than exercising the server. It runs in the
 * e2e project rather than the unit one for exactly that reason: `verify` runs
 * the unit suite before `astro build`, so a unit test here would read whatever
 * `dist/` happened to be left over. Playwright's `webServer` builds first.
 */
test('every internal link in the built site carries the deployment prefix', async () => {
  const base = resolveBase();
  const pages = await loadPages();

  /* A build with no internal links would pass by having nothing to check. */
  expect(pages.length).toBeGreaterThan(30);

  const offenders = pages.flatMap(({ file, html }) =>
    [...attributesOf(html, 'href'), ...attributesOf(html, 'src')]
      .filter((href) => isInternal(href))
      .filter((href) => !href.startsWith(`${base}/`) && href !== base)
      .map((href) => `${file} → ${href}`),
  );

  expect(offenders).toEqual([]);
});

test('every internal link in the built site resolves to a built file', async () => {
  const base = resolveBase();
  const files = new Set(await walk(distRoot));
  const pages = await loadPages();

  const dead = [];
  for (const { file, html } of pages) {
    const targets = [
      ...new Set(
        [...attributesOf(html, 'href'), ...attributesOf(html, 'src')]
          .filter((href) => isInternal(href))
          .map((href) => (base === '' ? href : href.slice(base.length) || '/'))
          .map((href) => href.split(/[?#]/u)[0]),
      ),
    ];

    for (const target of targets) {
      /* A link to the 404 document itself, and the empty target a bare `#`. */
      if (target === '' || target.endsWith('.html')) {
        continue;
      }
      const asFile = target.endsWith('/') ? path.join(target, 'index.html') : target;
      if (!files.has(path.join(distRoot, asFile))) {
        dead.push(`${file} → ${target}`);
      }
    }
  }

  expect(dead).toEqual([]);
});
