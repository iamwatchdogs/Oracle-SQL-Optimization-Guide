import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import { markdownProcessor } from '../../src/lib/markdown-processor.mjs';

const EXPECTED_DOCUMENTS = 37;

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

const render = async (markdown) => {
  const renderer = await markdownProcessor.createRenderer({});
  return (await renderer.render(markdown, {})).code;
};

const canonicalize = (html) => html.replaceAll(/>\s+</gu, '><').trim();

const disclosureSignature = (html) =>
  (html.match(/<details[^>]*class="group"[\s\S]*?<\/details>/gu) ?? []).map((node) =>
    canonicalize(node),
  );

const relative = (file) => file.replace(contentsRoot, '');

const notebookFiles = async () => {
  const files = (await walk(contentsRoot)).filter((file) => /\.mdx?$/u.test(file)).toSorted();
  return files;
};

const loadCorpus = async () => {
  const files = await notebookFiles();
  const documents = await Promise.all(
    files.map(async (file) => {
      const markdown = await readFile(file, 'utf8');
      const once = await render(markdown);
      const twice = await render(once);

      return { file, markdown, once, twice };
    }),
  );

  return documents;
};

test('the notebook corpus is the full 37 documents', async () => {
  expect((await notebookFiles()).length).toBe(EXPECTED_DOCUMENTS);
});

test('every shipped notebook document renders through the production processor', async () => {
  const documents = await loadCorpus();

  expect(documents.length).toBe(EXPECTED_DOCUMENTS);
  expect(
    documents.filter(({ once }) => once.length === 0).map(({ file }) => relative(file)),
  ).toEqual([]);
});

test("all 37 documents survive Astro's mandatory raw pass structurally unchanged", async () => {
  const documents = await loadCorpus();

  const drifted = documents
    .filter(({ once, twice }) => canonicalize(once) !== canonicalize(twice))
    .map(({ file }) => relative(file));
  const detailDrift = documents
    .filter(
      ({ once, twice }) =>
        canonicalize(disclosureSignature(once).join('')) !==
        canonicalize(disclosureSignature(twice).join('')),
    )
    .map(({ file }) => relative(file));

  expect(documents.length).toBe(EXPECTED_DOCUMENTS);
  expect(drifted).toEqual([]);
  expect(detailDrift).toEqual([]);
});

test("Astro's raw pass adds no disclosure and escapes no details markup", async () => {
  const documents = await loadCorpus();
  const problems = [];

  for (const { file, once, twice } of documents) {
    const first = disclosureSignature(once).length;
    const second = disclosureSignature(twice).length;

    if (first !== second) {
      problems.push(`${relative(file)}: ${first} -> ${second} disclosures`);
    }
    if (twice.includes('&lt;details')) {
      problems.push(`${relative(file)}: escaped details markup`);
    }
  }

  expect(problems).toEqual([]);
});

test('no shipped document relies on a project-added whole-document raw pass', async () => {
  const documents = await loadCorpus();
  const unexpanded = [];

  for (const { file, markdown, once } of documents) {
    const tags = (markdown.match(/<details/giu) ?? []).length;

    if (tags === 0) {
      continue;
    }
    const canonical = (once.match(/class="disclosure-content disclosure-flow"/gu) ?? []).length;

    if (canonical !== tags) {
      unexpanded.push(`${relative(file)}: ${tags} tags -> ${canonical} disclosures`);
    }
  }

  expect(documents.length).toBe(EXPECTED_DOCUMENTS);
  expect(unexpanded).toEqual([]);
});

test('rehype-raw is a transitive dependency of Astro only, never of this project', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const lockfile = await readFile(new URL('../../bun.lock', import.meta.url), 'utf8');
  const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };

  expect(Object.keys(declared)).not.toContain('rehype-raw');
  expect(Object.keys(declared)).not.toContain('hast-util-raw');
  expect(lockfile).toMatch(
    /"@astrojs\/markdown-remark":\s*\[[\s\S]*?"rehype-raw":\s*"\^7\.0\.0"[\s\S]*?\]/u,
  );
});
