import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
  compileMirroredStylesheet,
  compileProjectStylesheet,
} from '../../src/lib/tailwind-compile.mjs';

const repoRoot = new URL('../../', import.meta.url).pathname;
const stylesheetUrl = new URL('../../src/styles/global.css', import.meta.url);

const readStylesheet = () => readFile(stylesheetUrl, 'utf8');

const excludedSources = async () => {
  const css = await readStylesheet();
  return [...css.matchAll(/@source\s+not\s+'([^']+)'/gu)].map((match) => match[1]);
};

const includedSources = async () => {
  const css = await readStylesheet();
  return [...css.matchAll(/@source\s+(?!not\b)'([^']+)'/gu)].map((match) => match[1]);
};

const AGENT_SCRATCH_DIRECTORIES = ['.superpowers', '.freebuff', '.impeccable'];
const DOCUMENTED_SOURCES = ['../../DESIGN.md', '../../README.md'];
const CONFIG_SOURCES = ['../../astro.config.mjs', '../../lefthook.yml'];
const TEST_SOURCES = ['../../src/**/*.test.mjs', '../../src/**/*.test.ts'];

const REAL_SOURCE_INCLUSIONS = [
  '../../src/**/*.astro',
  '../../src/**/*.{ts,js,mjs}',
  '../../contents/**/*.md',
  '../../contents/**/*.mdx',
];

const INFRASTRUCTURE_DIRECTORIES = new Set(['.astro', '.cache', '.git', '.agents', 'node_modules']);

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(target);
      }
      return entry.isFile() ? [target] : [];
    }),
  );
  return nested.flat();
};

const tokenize = (text) =>
  new Set(text.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:[:/][^\s"'`]*)?/gu) ?? []);

const unescapeCss = (value) =>
  value.replaceAll(/\\(?:([\da-f]{1,6})[ \t\n]?|([\s\S]))/giu, (match, hex, literal) =>
    hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : (literal ?? match),
  );

const generatedClassNames = (css) => {
  const names = new Set(
    [...css.matchAll(/\.((?:\\.|[^\s.,:>+~()[\]{}"'`\\])+)/gu)].map((match) =>
      unescapeCss(match[1]),
    ),
  );
  return names;
};

const tokensIn = async (files) => {
  const texts = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  const all = new Set();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      all.add(token);
    }
  }
  return all;
};

async function topLevelDotDirectories() {
  const entries = await readdir(repoRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((name) => !INFRASTRUCTURE_DIRECTORIES.has(name))
    .toSorted();
}

test('every agent scratch directory is excluded from Tailwind source scanning', async () => {
  const excluded = await excludedSources();

  for (const directory of AGENT_SCRATCH_DIRECTORIES) {
    expect(excluded).toContain(`../../${directory}`);
  }
});

test('every top-level dot directory is either excluded or known infrastructure', async () => {
  const excluded = await excludedSources();
  const directories = await topLevelDotDirectories();

  for (const directory of directories) {
    const target = `../../${directory}`;
    const isKnownInfra = INFRASTRUCTURE_DIRECTORIES.has(directory);
    const isExcluded = excluded.includes(target);

    expect(isExcluded || isKnownInfra).toBe(true);
  }
});

test('non-rendered documents stay excluded so prose cannot emit utilities', async () => {
  const excluded = await excludedSources();

  for (const target of [...DOCUMENTED_SOURCES, ...CONFIG_SOURCES]) {
    expect(excluded).toContain(target);
  }
});

test('test files are excluded so assertions cannot emit utilities', async () => {
  const excluded = await excludedSources();
  const included = await includedSources();

  for (const target of TEST_SOURCES) {
    expect(excluded).toContain(target);
  }
  for (const target of included) {
    expect(target).not.toMatch(/\.test\.[mc]?[jt]s$/u);
  }
});

test('a candidate mentioned only in a test file generates no utility', async () => {
  const stylesheet = await readStylesheet();
  const probe = ['trunc', 'ate'].join('');
  const files = {
    'src/lib/probe.test.mjs': `test('probe', () => { expect('${probe}').toBeTruthy(); });`,
  };
  const hasProbe = (css) => generatedClassNames(css).has(probe);

  const guarded = await compileMirroredStylesheet(stylesheet, files);
  const unguarded = await compileMirroredStylesheet(
    stylesheet.replaceAll(/^@source not .*$/gmu, ''),
    files,
  );

  expect(hasProbe(guarded)).toBe(false);
  expect(hasProbe(unguarded)).toBe(true);
});

test('real template and content sources are included positively', async () => {
  const included = await includedSources();

  for (const source of REAL_SOURCE_INCLUSIONS) {
    expect(included).toContain(source);
  }
});

test('no source inclusion points at agent scratch, documents, or config', async () => {
  const included = await includedSources();
  const forbidden = [...AGENT_SCRATCH_DIRECTORIES, ...DOCUMENTED_SOURCES, ...CONFIG_SOURCES];

  for (const source of included) {
    expect(source.startsWith('../../src/') || source.startsWith('../../contents/')).toBe(true);
    for (const target of forbidden) {
      expect(source).not.toContain(target.replace(/^\.\.\/\.\.\//u, ''));
    }
  }
});

test('the scratch exclusion list still covers every agent directory once', async () => {
  const excluded = await excludedSources();
  const scratchExclusions = excluded.filter((target) =>
    AGENT_SCRATCH_DIRECTORIES.some((directory) => target.endsWith(directory)),
  );

  expect(scratchExclusions).toHaveLength(AGENT_SCRATCH_DIRECTORIES.length);
});

test('compiled utilities cover real templates and real content', async () => {
  const css = await compileProjectStylesheet();
  const generated = generatedClassNames(css);
  const [templateFiles, contentFiles] = await Promise.all([
    walk(path.join(repoRoot, 'src')),
    walk(path.join(repoRoot, 'contents')),
  ]);

  const templateTokens = await tokensIn(templateFiles);
  const contentTokens = await tokensIn(contentFiles);
  const coveredByContent = [...contentTokens].filter(
    (token) => !templateTokens.has(token) && generated.has(token),
  );
  const coveredByTemplates = [...templateTokens].filter((token) => generated.has(token));

  expect(coveredByContent.length).toBeGreaterThan(0);
  expect(coveredByTemplates.length).toBeGreaterThan(0);
});

test('scratch files cannot contribute utilities while real sources still can', async () => {
  const stylesheet = await readStylesheet();
  const templateProbe = ['under', 'line'].join('');
  const contentProbe = ['line', 'through'].join('-');
  const scratchProbe = ['ital', 'ic'].join('');
  const files = {
    'src/components/Probe.astro': `<div class="${templateProbe}"></div>`,
    'contents/probe.md': `<span class="${contentProbe}"></span>`,
    '.superpowers/probe.html': `<i class="${scratchProbe}"></i>`,
  };

  const guarded = await compileMirroredStylesheet(stylesheet, files);
  expect(guarded).toContain(`.${templateProbe} {`);
  expect(guarded).toContain(`.${contentProbe} {`);
  expect(guarded).not.toContain(`.${scratchProbe} {`);

  const unguarded = await compileMirroredStylesheet(
    stylesheet.replaceAll(/^@source not .*$/gmu, ''),
    files,
  );
  expect(unguarded).toContain(`.${scratchProbe} {`);
  expect(unguarded).toContain(`.${templateProbe} {`);
  expect(unguarded).toContain(`.${contentProbe} {`);
});
