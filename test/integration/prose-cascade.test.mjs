import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  isInsideLayer,
  normalizeHex,
  parseCompiledStylesheet,
  resolveToken,
  selectorsDeclaring,
} from '../../src/lib/css-cascade.mjs';
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';

const typographyTokens = [
  '--tw-prose-body',
  '--tw-prose-headings',
  '--tw-prose-links',
  '--tw-prose-code',
  '--tw-prose-hr',
  '--tw-prose-th-borders',
];

const allProseTokens = [
  ...typographyTokens,
  '--tw-prose-lead',
  '--tw-prose-bold',
  '--tw-prose-counters',
  '--tw-prose-bullets',
  '--tw-prose-quotes',
  '--tw-prose-quote-borders',
  '--tw-prose-captions',
  '--tw-prose-kbd',
  '--tw-prose-pre-code',
  '--tw-prose-pre-bg',
  '--tw-prose-td-borders',
  '--tw-prose-kbd-shadows',
];
const proseContext = (theme) => ({
  types: ['div'],
  classes: ['prose'],
  ancestors: [{ types: ['html'], attributes: { 'data-theme': theme } }],
});
const expectedTokens = {
  '--tw-prose-body': { dark: '#ece8e0', light: '#1a1815' },
  '--tw-prose-headings': { dark: '#ece8e0', light: '#1a1815' },
  '--tw-prose-links': { dark: '#8aa4ff', light: '#2d4a9a' },
  '--tw-prose-code': { dark: '#ece8e0', light: '#1a1815' },
  '--tw-prose-hr': { dark: '#2a2a2e', light: '#d9d4cb' },
  '--tw-prose-th-borders': { dark: '#3a3a40', light: '#b8b3a9' },
};
const compiled = compileProjectStylesheet();

/*
 * THE REGRESSION THIS SPEC EXISTS FOR.
 *
 * `@tailwindcss/typography` emits its whole `.prose` block into the `utilities`
 * cascade layer, which outranks `@layer components` regardless of specificity.
 * The plugin also ships `:where(...)` rules that zero the inline padding of a
 * row's first and last cell, so an authored `.prose td { padding }` written in
 * `components` was discarded outright and the outer columns of every wide table
 * sat flush against the rule. The fix was to leave the authored prose
 * typography unlayered — so every assertion below checks layer MEMBERSHIP first
 * and selector text second. A selector-only test would pass again the moment
 * the block was re-wrapped.
 */
const AUTHORED_UNLAYERED_SELECTORS = [
  '.prose table',
  '.prose thead th',
  '.prose tbody td, .prose tfoot td',
  '.prose :not(pre) > code',
];

const unlayeredRules = (sheet) =>
  sheet.rules.filter((rule) => rule.layer === null && isInsideLayer(sheet, rule.start) === null);

const ruleFor = (sheet, selector) =>
  sheet.rules.find((rule) => rule.selector === selector && rule.layer === null) ?? null;

/* Horizontal component of a `padding` shorthand, whatever its arity. The
 * compiled sheet drops the leading zero, so compare values, not text. */
const inlinePaddingOf = (shorthand) => String(shorthand ?? '').split(/\s+/u)[1] ?? shorthand;

/* A bare `.prose th` / `.prose td` subject, i.e. padding set outside the
 * `thead` / `tbody` / `tfoot` qualification. */
const isBareCellSubject = (selector) => /^(?:th|td|\.prose\s+(?:th|td))$/u.test(selector.trim());

const declaresPadding = (rule) =>
  [
    'padding',
    'padding-block',
    'padding-inline',
    'padding-top',
    'padding-bottom',
    'padding-left',
    'padding-right',
  ].some((property) => rule.declarations.has(property));

/* Offset just past the end of the block that opens at `opener`. */
const blockEnd = (css, opener) => {
  let depth = 0;

  for (let cursor = opener; cursor < css.length; cursor += 1) {
    depth += css[cursor] === '{' ? 1 : css[cursor] === '}' ? -1 : 0;
    if (depth === 0) {
      return cursor;
    }
  }
  return css.length;
};

test('typography token defaults are emitted in the utilities layer', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const pluginDefaults = selectorsDeclaring(stylesheet, ['--tw-prose-body']).filter(
    (rule) => rule.layer === 'utilities',
  );
  expect(pluginDefaults.length).toBeGreaterThan(0);
  for (const rule of pluginDefaults) {
    expect(isInsideLayer(stylesheet, rule.start)?.name).toBe('utilities');
  }
});

test('project prose tokens live in an unlayered .prose rule', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const projectRules = selectorsDeclaring(stylesheet, typographyTokens).filter(
    (rule) => rule.layer === null,
  );
  expect(projectRules).toHaveLength(1);
  expect(projectRules[0].selector).toBe('.prose');
  expect(isInsideLayer(stylesheet, projectRules[0].start)).toBeNull();
  for (const token of allProseTokens) {
    expect(projectRules[0].declarations.has(token)).toBe(true);
  }
});

test('prose tokens are not enumerated per theme attribute', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const selectors = selectorsDeclaring(stylesheet, allProseTokens).map((rule) => rule.selector);
  expect(new Set(selectors)).toEqual(new Set(['.prose']));
});

test('kbd shadows stay transparent inside the same unlayered rule', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const projectRules = selectorsDeclaring(stylesheet, ['--tw-prose-kbd-shadows']).filter(
    (rule) => rule.layer === null,
  );
  expect(projectRules).toHaveLength(1);
  expect(projectRules[0].selector).toBe('.prose');
  expect(projectRules[0].declarations.get('--tw-prose-kbd-shadows')).toBe('transparent');
  expect(projectRules[0].declarations.has('--tw-prose-body')).toBe(true);
  expect(resolveToken(css, proseContext('dark'), '--tw-prose-kbd-shadows')).toBe('transparent');
  expect(resolveToken(css, proseContext('light'), '--tw-prose-kbd-shadows')).toBe('transparent');
});

test('prose tokens resolve to project palette values in both theme states', async () => {
  const css = await compiled;
  for (const [token, expected] of Object.entries(expectedTokens)) {
    for (const theme of ['dark', 'light']) {
      expect(normalizeHex(resolveToken(css, proseContext(theme), token))).toBe(expected[theme]);
    }
  }
});

test('prose tokens never fall back to typography plugin defaults', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const pluginValues = new Set(
    selectorsDeclaring(stylesheet, typographyTokens)
      .filter((rule) => rule.layer === 'utilities')
      .flatMap((rule) => typographyTokens.map((token) => rule.declarations.get(token)))
      .filter(Boolean),
  );
  expect(pluginValues.size).toBeGreaterThan(0);
  for (const theme of ['dark', 'light']) {
    for (const token of typographyTokens) {
      const resolved = resolveToken(css, proseContext(theme), token);
      expect(pluginValues.has(resolved)).toBe(false);
      expect(normalizeHex(resolved)).not.toBeNull();
    }
  }
});

test('the authored prose table, cell and inline-code rules are unlayered', async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  const layered = sheet.rules.filter((r) => r.selector.startsWith('.prose') && r.layer !== null);

  for (const selector of AUTHORED_UNLAYERED_SELECTORS) {
    const rule = ruleFor(sheet, selector);

    expect(rule, `no unlayered rule for ${selector}`).not.toBeNull();
    expect(rule.layer).toBeNull();
    expect(isInsideLayer(sheet, rule.start)).toBeNull();
  }
  /* The plugin's own `.prose` output IS layered, so the assertions above are
   * not merely checking that no such rules exist at all. */
  expect(layered.length).toBeGreaterThan(0);
  for (const rule of layered) {
    expect(isInsideLayer(sheet, rule.start)?.name).toBe('utilities');
  }
  expect(sheet.layerRank.get('utilities')).toBeGreaterThan(sheet.layerRank.get('components') ?? -1);
});

test('the prose typography block is not wrapped in a components layer', async () => {
  const source = await readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8');
  const withoutComments = source.replaceAll(/\/\*[\s\S]*?\*\//gu, '');

  /*
   * `@layer components {` around the prose block was the bug. Only real
   * declarations count: the file still names the layer in its explanatory
   * comments, and those are documentation, not cascade.
   */
  expect(withoutComments).not.toContain('@layer components');
  expect([...withoutComments.matchAll(/@layer\s+([\w-]+)/gu)].map(([, n]) => n)).toEqual(['base']);

  /* And the authored table rule is lexically after that one block closes. */
  const opener = withoutComments.indexOf('@layer base {');
  expect(opener).toBeGreaterThan(-1);
  expect(withoutComments.indexOf('.prose table {')).toBeGreaterThan(
    blockEnd(withoutComments, opener),
  );
});

test('cell padding is set through thead th and tbody td, not bare subjects', async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  const thead = ruleFor(sheet, '.prose thead th');
  const tbody = ruleFor(sheet, '.prose tbody td, .prose tfoot td');

  /* A bare `.prose th` / `.prose td` is the rule that silently loses to the
   * plugin's `:where(thead td:first-child)` in the `utilities` layer. Padding
   * must ride on the section-qualified subjects instead. */
  expect(unlayeredRules(sheet).filter((r) => isBareCellSubject(r.selector))).toEqual([]);
  expect(declaresPadding(thead)).toBe(true);
  expect(declaresPadding(tbody)).toBe(true);
  /* Both sides get the same inline padding, so no cell is glued to the column
   * edge — the header differs only in its block-end padding. */
  const headerInline = inlinePaddingOf(thead.declarations.get('padding'));

  expect(headerInline).toBe(inlinePaddingOf(tbody.declarations.get('padding')));
  expect(headerInline).toMatch(/^(?:\.9|0\.9)rem$/u);
});

test('the table box scrolls, and its header keeps a 1px hairline', async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  const table = ruleFor(sheet, '.prose table');
  const thead = ruleFor(sheet, '.prose thead th');

  /* `overscroll-behavior-x: contain` stops a horizontal swipe chaining to the
   * document, which is what let a wide table widen the whole page on a phone.
   * DESIGN.md requires 1px hairlines; the old header rule was the only 2px
   * edge in the system. */
  expect(table.declarations.get('overscroll-behavior-x')).toBe('contain');
  expect(table.declarations.get('overflow-x')).toBe('auto');
  expect(table.declarations.get('display')).toBe('block');
  expect(thead.declarations.get('border-bottom')).toBe('1px solid var(--rule-strong)');
  for (const property of ['border-top', 'border-left', 'border-right', 'border']) {
    expect(thead.declarations.has(property)).toBe(false);
  }
});

test('the table zebra token is declared in both theme scopes', async () => {
  const css = await compiled;
  const sheet = parseCompiledStylesheet(css);
  const LIGHT = '[data-theme="light"]';
  const bySelector = new Map(
    selectorsDeclaring(sheet, ['--table-zebra']).map((rule) => [
      rule.selector,
      rule.declarations.get('--table-zebra'),
    ]),
  );

  /* Light and dark are tuned separately: one shared alpha would read as a wash
   * on one paper and vanish on the other. */
  expect(bySelector.size).toBe(2);
  expect(bySelector.get(':root')).not.toBeNull();
  expect(bySelector.get(LIGHT)).not.toBeNull();
  expect(bySelector.get(':root')).not.toBe(bySelector.get(LIGHT));
  expect(resolveToken(css, proseContext('dark'), '--table-zebra')).toBe(bySelector.get(':root'));
  expect(resolveToken(css, proseContext('light'), '--table-zebra')).toBe(bySelector.get(LIGHT));
  const zebra = unlayeredRules(sheet).find((r) => r.selector === '.prose tbody tr:nth-child(odd)');
  expect(zebra?.declarations.get('background')).toBe('var(--table-zebra)');
});

test('the prose container breaks slash-joined identifier chains', async () => {
  const sheet = parseCompiledStylesheet(await compiled);
  const containers = unlayeredRules(sheet).filter(
    (rule) => rule.selector === '.prose' && rule.declarations.has('overflow-wrap'),
  );
  /*
   * A GFM list item chains bare identifiers with `/`. Each `<code>` chip is
   * narrower than the column, so only the CONTAINER can see the 373px
   * `/`-joined run and break it. `anywhere` would not: it refuses to break a
   * token that fits on a line by itself.
   */
  expect(containers).toHaveLength(1);
  expect(containers[0].declarations.get('overflow-wrap')).toBe('break-word');
  const chip = ruleFor(sheet, '.prose :not(pre) > code');
  expect(chip?.declarations.get('overflow-wrap')).toBe('break-word');
  expect(chip?.declarations.get('word-break')).toBe('normal');
});
