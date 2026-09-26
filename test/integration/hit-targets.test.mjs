import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { parseCompiledStylesheet } from '../../src/lib/css-cascade.mjs';
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const compiled = compileProjectStylesheet();

const elementWith = (source, tag, needle) => {
  const element = source.match(
    new RegExp(`<${tag}\\b[\\s\\S]*?${needle}[\\s\\S]*?</${tag}>`, 'u'),
  )?.[0];

  expect(element).toBeDefined();
  return element;
};

const matchesOf = (source, pattern) => (source ?? '').match(pattern) ?? [];

const compiledScale = async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const declaration = (selector, property) =>
    stylesheet.rules.find((rule) => rule.selector === selector)?.declarations.get(property) ?? null;
  const rootRule = stylesheet.rules.find((rule) => rule.selector.startsWith(':root'));
  const spacingDeclaration = rootRule?.declarations.get('--spacing') ?? '0rem';

  return {
    spacing: Number(/[\d.]+/u.exec(spacingDeclaration)?.[0] ?? '0'),
    themeToggle: declaration('.min-h-11', 'min-height'),
    themeToggleWidth: declaration('.min-w-11', 'min-width'),
    standalone: declaration('.min-h-6', 'min-height'),
    standaloneWidth: declaration('.min-w-6', 'min-width'),
  };
};

test('the theme toggle keeps a 44x44 hit target and its running-head type', async () => {
  const layout = await readSource('../../src/layouts/BaseLayout.astro');
  const toggle = elementWith(layout, 'button', 'id="theme-toggle"');

  expect(toggle).toContain('min-h-11');
  expect(toggle).toContain('min-w-11');
  expect(toggle).toContain('font-sans text-ui font-medium leading-none text-ink');
});

test('breadcrumb home, the full key, book home, and the no-JS source appendix each carry a 24x24 hit target', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');

  for (const text of ['Home', 'Full key', '← Book home', 'Source appendix']) {
    const anchor = elementWith(page, 'a', text);

    expect(anchor).toContain('inline-flex');
    expect(anchor).toContain('min-h-6');
    expect(anchor).toContain('min-w-6');
    expect(anchor).toContain('items-center');
  }
});

test('the no-JS source appendix link mirrors the full key hit-target shape', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const noscript = page.match(/<noscript>[\s\S]*?<\/noscript>/u)?.[0] ?? '';

  expect(noscript).toContain('href="/07-appendix-sources/"');
  expect(noscript).toContain('inline-flex min-h-6 min-w-6 items-center');
});

test('breadcrumb intermediate anchors carry the same 24x24 hit target as Home', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const [intermediate = ''] = matchesOf(page, /<a\s+href=\{item\.href\}[\s\S]*?<\/a>/u);

  expect(intermediate).toContain('inline-flex min-h-6 min-w-6 items-center');
  expect(intermediate).toContain('no-underline transition-colors hover:text-accent');
});

test('match counts stay ordinary assertion failures when nothing matches', () => {
  expect(matchesOf('no hits here', /min-h-6/gu)).toEqual([]);
  expect(matchesOf(null, /min-h-6/gu)).toEqual([]);
  expect(matchesOf(undefined, /min-h-6/gu)).toEqual([]);
  expect(matchesOf('class="min-h-6"', /min-h-6/gu)).toEqual(['min-h-6']);
});

test('only the five standalone links take the hit-target utilities', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const proseClass = page.slice(page.indexOf('const proseClass = ['), page.indexOf(".join(' ');"));

  expect(matchesOf(page, /min-h-6/gu)).toHaveLength(5);
  expect(matchesOf(page, /min-w-6/gu)).toHaveLength(5);
  expect(proseClass).not.toContain('min-h-6');
  expect(proseClass).not.toContain('min-w-6');
  expect(proseClass).toContain('prose-a:text-accent');
  expect(proseClass).toContain('prose-a:wrap-anywhere');
});

test('the TOC number span keeps its layout width without a hit-target utility', async () => {
  const toc = await readSource('../../src/components/ReadingToc.astro');
  const numberClass = toc.match(/const tocNumClass\s*=\s*'([^']+)'/u)?.[1] ?? '';

  expect(numberClass).toContain('w-6');
  expect(numberClass).not.toContain('min-w-6');
});

test('the compiled stylesheet resolves both hit-target scales to 44px and 24px', async () => {
  const rootFontPx = 16;
  const { spacing, themeToggle, themeToggleWidth, standalone, standaloneWidth } =
    await compiledScale();

  expect(spacing * 11 * rootFontPx).toBe(44);
  expect(spacing * 6 * rootFontPx).toBe(24);
  expect(themeToggle).toContain('11');
  expect(themeToggleWidth).toContain('11');
  expect(standalone).toContain('6');
  expect(standaloneWidth).toContain('6');
});
