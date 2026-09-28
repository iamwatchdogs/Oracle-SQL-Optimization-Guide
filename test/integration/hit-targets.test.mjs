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
  expect(toggle).toContain('font-sans text-ui font-medium leading-none');
});

test('the three header triggers share one resting treatment', async () => {
  /*
   * The theme toggle used to carry `text-ink` while the two dropdowns beside it
   * carried `text-ink-muted`, and all three painted a permanent `--control-edge`
   * box in a header that already has a hairline under it. The complaint was that
   * the least important thing on the page was the loudest, and it was true twice
   * over: three boxes, and one of the three louder in ink than its neighbours.
   *
   * The previous test pinned `text-ink` on the toggle while its name claimed to be
   * about type, so it held the loudness in place without meaning to. This asserts
   * the property that was actually wanted — the three agree — which is stronger
   * than one control's colour and cannot be satisfied by editing one string.
   */
  const layout = await readSource('../../src/layouts/BaseLayout.astro');
  /*
   * The two ids live on the `<details>`, not the `<summary>`, so the triggers are
   * found by the label inside them: "Contents" and "Reading". Both are read as
   * accessible names by the site's own tests, so neither can be renamed out from
   * under this one.
   */
  const summaryWith = (needle) =>
    matchesOf(layout, /<summary\b[\s\S]*?<\/summary>/gu).find((summary) =>
      summary.includes(needle),
    );
  const triggers = [
    summaryWith('>Contents<'),
    summaryWith('>Reading<'),
    elementWith(layout, 'button', 'id="theme-toggle"'),
  ];

  for (const trigger of triggers) {
    expect(trigger).toBeDefined();
    /* No box at rest, and the box returns for every state that needs one. */
    expect(trigger).toContain('border-transparent');
    expect(trigger).toContain('hover:border-control-edge');
    expect(trigger).toContain('focus-visible:border-control-edge');
    expect(trigger).toContain('text-ink-muted');
    /* The 44px floor survives, and it comes from the min-height rather than the
       padding the border used to sit inside. */
    expect(trigger).toContain('min-h-11');
  }

  /* Both dropdowns additionally draw the edge when they are open. */
  for (const trigger of triggers.slice(0, 2)) {
    expect(trigger).toContain('group-open:border-control-edge');
  }
});

test('breadcrumb home, the full key, and book home each carry a 24x24 hit target', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');

  /* "Book home" is preceded by a decorative `←` inside its own `aria-hidden`
   * span, so the anchor is matched on its text node rather than the arrow. */
  for (const text of ['Home', 'Full key', 'Book home']) {
    const anchor = elementWith(page, 'a', text);

    /*
     * `inline-block`, not `inline-flex`. The breadcrumb anchors sit in a block
     * item beside their separator with no whitespace between them, which is what
     * keeps the two glued — but a flex container would make the label an atomic
     * inline that cannot share a line with the separator at all, and the whole
     * point of the current markup is that the label wraps INSIDE the crumb while
     * the separator stays on the first line. The floor is unchanged.
     */
    expect(anchor).toContain('inline-block');
    expect(anchor).toContain('min-h-6');
    expect(anchor).toContain('min-w-6');
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

  expect(intermediate).toContain('inline-block min-h-6 min-w-6');
  expect(intermediate).toContain('no-underline transition-colors hover:text-accent');
  /* The regression this replaced: a nowrap crumb title was a 467px unbreakable
   * run in a 346px column, which widened the document by 122px at 390px. */
  expect(intermediate).not.toContain('whitespace-nowrap');
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

  /*
   * The breadcrumb separator is now INSIDE its anchor rather than a sibling of it,
   * so the anchor's text begins with the `/`. A label is an `inline-block`, which is
   * atomic, so a sibling separator could be left alone on the line above a title too
   * long for the space left on its line — and at the measure cap that was happening
   * to "Appendix Sources - How Every Claim Is Checked" on a laptop.
   *
   * So the expected label carries the `/`, and the next assertion is the one that
   * matters about it: the separator is `aria-hidden`, so it is decoration inside a
   * link and never becomes part of the link's accessible name. What the reader
   * navigates by is still the title.
   */
  expect(labelled).toEqual(['Home', '/ {item.title}', 'Full key', '← Book home']);

  const breadcrumbAnchor = page.match(/<a\s+href=\{item\.href\}[\s\S]*?<\/a>/u)?.[0] ?? '';
  expect(breadcrumbAnchor).toMatch(/aria-hidden="true"/u);
  expect(breadcrumbAnchor).toMatch(/\{item\.title\}/u);
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
