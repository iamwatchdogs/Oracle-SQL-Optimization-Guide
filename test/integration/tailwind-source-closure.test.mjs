import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
  compileMirroredStylesheet,
  compileProjectStylesheet,
} from '../../src/lib/tailwind-compile.mjs';
import { parseCompiledStylesheet } from '../../src/lib/css-cascade.mjs';

const repoRoot = new URL('../../', import.meta.url).pathname;
const stylesheetUrl = new URL('../../src/styles/global.css', import.meta.url);

const readStylesheet = () => readFile(stylesheetUrl, 'utf8');

const includedSources = async () => {
  const css = await readStylesheet();
  return [...css.matchAll(/@source\s+(?!not\b)'([^']+)'/gu)].map((match) => match[1]);
};

/**
 * The ONLY places Tailwind may look for class names.
 *
 * Everything else — the 1800-line test tree, the probe directory, config files,
 * PRODUCT.md, AGENTS.md, `bun.lock`, `public/**` — is unreachable, because the
 * import declares `source(none)`.
 */
const REAL_SOURCE_INCLUSIONS = [
  '../../src/**/*.astro',
  '../../src/**/*.{ts,js,mjs}',
  '../../contents/**/*.md',
  '../../contents/**/*.mdx',
];

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

/**
 * Every class name that appears in a SELECTOR position in the compiled sheet.
 *
 * The token must be followed by a character that can only end a class selector
 * (whitespace, `,`, `{`, `:`, `>`, `+`, `~`). A bare `\.name` match also picks
 * up fragments of declaration VALUES — `--tw-filter`, the `.5` in
 * `filter: invert(1)` — and reports utilities that ship zero rules.
 */
const generatedClassNames = (css) => {
  const names = new Set(
    [...css.matchAll(/\.((?:\\.|[-\w])+)(?=[\s,{:>+~])/gu)].map((match) => unescapeCss(match[1])),
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

const hasUtility = (css, name) => generatedClassNames(css).has(name);
/** Build a class name from fragments so the source does not itself contain the
 * literal utility — a negative assertion must not be a place that introduces it. */
const splitName = (parts) => parts.join('');

/*
 * Real Tailwind utilities that appear in NO template and NO content file, so a
 * match can only come from a file that is not a declared source. Verified
 * against the actual repo before being chosen.
 */
const UNUSED_UTILITY = splitName(['line', '-through']);
const UNUSED_UTILITY_2 = splitName(['con', 'tainer']);
const BANNED_UTILITY = splitName(['sha', 'dow']);

test('automatic source detection is switched off', async () => {
  const css = await readStylesheet();

  /*
   * `@source not` only subtracts from the EXPLICIT set — it does not disable
   * Tailwind v4's root crawl. Without `source(none)` the scanned set was the
   * union of the declared globs and everything auto-detected, so a test title
   * containing the word "shadow" generated `.shadow`, and DESIGN.md bans the
   * elevation scale. A negative assertion about a utility must not be a place
   * that introduces it.
   */
  expect(css).toMatch(/@import\s+'tailwindcss'\s+source\(none\)/u);
  expect(css).not.toMatch(/@import\s+'tailwindcss'\s*;/u);
});

test('the only inclusions are the real template and content globs', async () => {
  expect(await includedSources()).toEqual(REAL_SOURCE_INCLUSIONS);
});

test('no inclusion reaches the test tree, the probe directory, docs, or config', async () => {
  const included = await includedSources();

  for (const source of included) {
    expect(source.startsWith('../../src/') || source.startsWith('../../contents/')).toBe(true);
    expect(source).not.toContain('test/');
    expect(source).not.toContain('.md"');
    expect(source).not.toContain('config');
  }
});

test('a candidate outside every declared source generates no utility', async () => {
  const stylesheet = await readStylesheet();

  /*
   * Provable pair: the SAME class name is unreachable from a file outside the
   * globs and reachable from a file inside one. That is the whole guarantee.
   */
  const outside = await compileMirroredStylesheet(stylesheet, {
    'test/integration/probe.test.mjs': `expect(css).toContain('${UNUSED_UTILITY}');`,
  });
  expect(hasUtility(outside, UNUSED_UTILITY)).toBe(false);

  const inside = await compileMirroredStylesheet(stylesheet, {
    'src/components/Probe.astro': `<div class="${UNUSED_UTILITY}"></div>`,
  });
  expect(hasUtility(inside, UNUSED_UTILITY)).toBe(true);
});

test('a candidate mentioned only in a probe script generates no utility', async () => {
  const stylesheet = await readStylesheet();
  const outside = await compileMirroredStylesheet(stylesheet, {
    'test/probe/scratch.mjs': `console.log('${UNUSED_UTILITY_2}');`,
  });
  const inside = await compileMirroredStylesheet(stylesheet, {
    'contents/probe.md': `<span class="${UNUSED_UTILITY_2}"></span>`,
  });

  expect(hasUtility(outside, UNUSED_UTILITY_2)).toBe(false);
  expect(hasUtility(inside, UNUSED_UTILITY_2)).toBe(true);
});

test('a negative assertion about a banned utility does not generate it', async () => {
  const stylesheet = await readStylesheet();
  const guarded = await compileMirroredStylesheet(stylesheet, {
    'test/integration/probe.test.mjs': `expect(css).not.toContain('${BANNED_UTILITY}');`,
  });

  // DESIGN.md bans the shadow scale outright; the class must not be reachable
  // from a spec that merely names it.
  expect(hasUtility(guarded, BANNED_UTILITY)).toBe(false);
});

/**
 * Utilities that used to ship ONLY because a non-source file mentioned them.
 *
 * Before `source(none)`, every one of these was generated by a file that is not
 * a declared source — a spec title, a spec whose whole job was to assert the
 * utility was absent, or the exclusion list's own test fixtures.
 *
 * Deliberately NOT in this list:
 *   - `isolate` — the word genuinely appears in five `contents/` files, which
 *     ARE declared sources. It is not a leak and must not be described as one.
 *   - `filter` / `transition` / `container` — see the next test.
 */
test('utilities leaked from non-source files no longer ship', async () => {
  const css = await compileProjectStylesheet();
  const generated = generatedClassNames(css);

  for (const leaked of [
    BANNED_UTILITY,
    'drop-shadow',
    'drop-shadow-sm',
    'group-open\\:rotate-90',
    'grid-rows-[0fr]',
    UNUSED_UTILITY,
  ]) {
    expect(generated, `"${leaked}" still ships`).not.toContain(leaked);
  }
});

/**
 * `.filter`, `.transition` and `.container` DO still ship, for reasons that are
 * legitimate, and this test records why so nobody re-litigates them:
 *   - `.filter` / `.transition` — the tokens appear in real declared sources
 *     (`src/lib/*.mjs` call `Array.prototype.filter`; the templates use
 *     `transition-*` utilities). Scanning source code cannot avoid that.
 *   - `.container` — generated by Tailwind because `@theme inline` declares
 *     `--container-reading` / `--container-contributions` / `--container-measure`.
 *
 * DESIGN.md's actual concern is that no shadow is PAINTED. That is what is
 * asserted: the filter and transition utilities carry no shadow.
 */
test('the utilities that legitimately ship carry no shadow', async () => {
  const sheet = parseCompiledStylesheet(await compileProjectStylesheet());

  for (const rule of sheet.rules) {
    if (!/\.(filter|transition|container)(?![-\w])/u.test(rule.selector)) {
      continue;
    }
    for (const property of rule.declarations.keys()) {
      expect(property, `${rule.selector} declares ${property}`).not.toBe('box-shadow');
    }
  }
});

test('real template and content sources still reach the bundle', async () => {
  const stylesheet = await readStylesheet();
  const files = {
    'src/components/Probe.astro': '<div class="underline"></div>',
    'contents/probe.md': `<span class="${UNUSED_UTILITY}"></span>`,
    'contents/section/probe.mdx': `<span class="${UNUSED_UTILITY_2}"></span>`,
  };

  const guarded = await compileMirroredStylesheet(stylesheet, files);
  expect(guarded).toContain('.underline');
  expect(guarded).toContain(`.${UNUSED_UTILITY}`);
  expect(guarded).toContain(`.${UNUSED_UTILITY_2}`);
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

/**
 * The compiled stylesheet must not contain `pointer-events-auto` at all.
 *
 * The bug this was written for: `src/**` is a declared Tailwind source and the
 * scanner does not skip COMMENTS, so `pointer-events-auto` sat inside a comment
 * in `BaseLayout.astro` explaining why it must never be used — outside the slice
 * the source-level check matched on. Every source-level assertion stayed green
 * while the shipped CSS grew
 *
 *     .data-\[visible\=true\]\:pointer-events-auto[data-visible="true"]
 *       { pointer-events: auto; }
 *
 * which is (0,2,0) and beats the base `pointer-events-none` at (0,1,0). A
 * full-width, z-50 element became a click blocker for the whole duration of every
 * slow navigation.
 *
 * It was found on the route loader, which no longer exists. The check is kept and
 * generalised, because the failure mode is not about loaders: any utility named in
 * a comment, a class, or a string anywhere in a declared source reaches the
 * output. Asserting against the COMPILED OUTPUT is the only level at which this is
 * checkable.
 */
test('the compiled stylesheet never re-enables hit testing', async () => {
  const css = await compileProjectStylesheet();

  /* Only the negative half survives. It used to be paired with
     `toContain('.pointer-events-none')` to prove the base class was emitted, but
     the only element carrying it was the route loader, and that is gone. With
     nothing in the project using the utility the positive assertion had nothing
     left to say and would only have begun failing the next time an element that
     wants `pointer-events: none` stops existing. The invariant is the negative
     one: nothing anywhere may turn hit testing back on. */
  expect(css).not.toMatch(/pointer-events-auto/u);
});
