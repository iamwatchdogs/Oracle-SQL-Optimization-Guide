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

test('breadcrumb home, the full key, and book home each carry a 24x24 hit target', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');

  /* "Book home" is preceded by a decorative `←` inside its own `aria-hidden`
   * span, so the anchor is matched on its text node rather than the arrow. */
  for (const text of ['Home', 'Full key', 'Book home']) {
    const anchor = elementWith(page, 'a', text);

    expect(anchor).toContain('inline-flex');
    expect(anchor).toContain('min-h-6');
    expect(anchor).toContain('min-w-6');
    expect(anchor).toContain('items-center');
  }
});

/*
 * The `<noscript>` "Source appendix" block was deleted. Astro strips every
 * `<noscript>` from the incoming document during a client-side navigation, so
 * the link only ever existed on a hard first load and vanished on the first
 * in-site click — the one case it was supposed to help. These assertions keep
 * it removed rather than merely unused.
 */
test('the no-JS source appendix block stays removed', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');

  expect(page).not.toContain('<noscript>');
  expect(page).not.toContain('</noscript>');
  expect(page).not.toContain('Source appendix');
  expect(page).not.toContain('href="/07-appendix-sources/"');
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

test('only the four standalone links take the hit-target utilities', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const proseClass = page.slice(page.indexOf('const proseClass = ['), page.indexOf(".join(' ');"));
  const anchors = [...page.matchAll(/<a\b[\s\S]*?<\/a>/gu)].map(([anchor]) => anchor);
  const hitTarget = /class="[^"]*\bmin-h-6\b[^"]*\bmin-w-6\b[^"]*"/u;

  /* Was five; the noscript source-appendix link is gone. */
  expect(matchesOf(page, /min-h-6/gu)).toHaveLength(4);
  expect(matchesOf(page, /min-w-6/gu)).toHaveLength(4);
  expect(anchors.filter((anchor) => hitTarget.test(anchor))).toHaveLength(4);
  expect(proseClass).not.toContain('min-h-6');
  expect(proseClass).not.toContain('min-w-6');
  expect(proseClass).toContain('prose-a:text-accent');
  expect(proseClass).toContain('prose-a:wrap-anywhere');
});

test('the four hit-target anchors are the ones the reader navigates by', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const anchors = [...page.matchAll(/<a\b[\s\S]*?<\/a>/gu)].map(([anchor]) => anchor);
  const labelled = anchors
    .filter((anchor) => /class="[^"]*\bmin-h-6\b/u.test(anchor))
    .map((anchor) =>
      anchor
        .replaceAll(/<[^>]*>/gu, ' ')
        .replaceAll(/\s+/gu, ' ')
        .trim(),
    );

  expect(labelled).toEqual(['Home', '{item.title}', 'Full key', '← Book home']);
});

test('the TOC number span keeps its layout width without a hit-target utility', async () => {
  const toc = await readSource('../../src/components/ReadingToc.astro');
  const numberClass =
    toc.match(/const tocNumClass\s*=\s*(?:\/\/[^\n]*\n\s*)*'([^']+)'/u)?.[1] ?? '';
  const ordinals = matchesOf(toc, /<span class=\{tocNumClass\}[^>]*>/gu);

  expect(numberClass).toContain('w-6');
  /* `shrink-0` keeps the ordinal from collapsing and nudging the heading text
   * as the label truncates inside the 280px rail. */
  expect(numberClass).toContain('shrink-0');
  expect(numberClass).not.toContain('min-w-6');
  expect(numberClass).not.toContain('min-h-6');
  /* Decorative index, not part of the destination's name. */
  expect(ordinals).toHaveLength(2);
  for (const ordinal of ordinals) {
    expect(ordinal).toContain('aria-hidden="true"');
  }
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
