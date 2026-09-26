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

test('typography token defaults are emitted in the utilities layer', async () => {
  const css = await compiled;
  const stylesheet = parseCompiledStylesheet(css);
  const declaring = selectorsDeclaring(stylesheet, ['--tw-prose-body']);
  const pluginDefaults = declaring.filter((rule) => rule.layer === 'utilities');

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
