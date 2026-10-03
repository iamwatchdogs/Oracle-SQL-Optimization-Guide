import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  resolveToken,
  ruleMatches,
  splitSelector,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';
import { CLOSING_ATTRIBUTE, FLOW_CLASS } from '../../src/lib/disclosure-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const compiled = compileProjectStylesheet();

const matchesOf = (source, pattern) => source.match(pattern) ?? [];

const PADDING_PROPERTIES = [
  'padding',
  'padding-block',
  'padding-inline',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
];

const INNER_CLASS = /\.disclosure-(?:content|flow)-inner/u;

const DISCLOSURE_ASTRO_SOURCES = [
  '../../src/layouts/BaseLayout.astro',
  '../../src/components/HomeTitleBlock.astro',
  '../../src/components/ReadingToc.astro',
];

const isUnconditionalInnerSubject = (selector) => {
  const chain = splitSelector(selector);
  const subject = chain.at(-1)?.compound ?? '';

  return (
    INNER_CLASS.test(subject) && chain.slice(0, -1).every((link) => !link.compound.includes('['))
  );
};

/*
 * Contexts model the REAL shipped DOM.
 *
 * These previously carried a `div.prose` ancestor, which fabricated a structure
 * that exists on no built page: not one of the three shipped disclosures (site
 * nav, evidence key, mobile table of contents) lives inside the article body.
 * The whole point of the component contract is that it is scoped to the
 * `details` element, so the context must not imply a `.prose` scope. The
 * `.prose` variants are covered separately by
 * `disclosure-native-fallback.test.mjs`.
 */
const flowContext = (detailsAttributes = {}) => ({
  classes: ['disclosure-flow'],
  ancestors: [
    { types: ['details'], attributes: detailsAttributes, children: [{}] },
    { types: ['div'], classes: ['w-shell'] },
  ],
});

const innerContext = (detailsAttributes = {}) => ({
  classes: ['disclosure-content-inner', 'disclosure-flow-inner'],
  ancestors: [
    { types: ['div'], classes: ['disclosure-flow'] },
    { types: ['details'], classes: ['disclosure'], attributes: detailsAttributes },
    { types: ['div'], classes: ['w-shell'] },
  ],
});

const resolve = async (context, property) => resolveToken(await compiled, context, property);

const iconContext = (attributes = {}) => ({
  types: ['svg'],
  classes: ['disclosure-icon'],
  ancestors: [
    { types: ['summary'] },
    { types: ['details'], attributes },
    { types: ['div'], classes: ['w-shell'] },
  ],
});

const iconRotationRules = async (attributes) => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const context = createContext(iconContext(attributes));

  return stylesheet.rules.filter(
    (rule) => rule.declarations.has('rotate') && ruleMatches(rule.selector, context),
  );
};

test('a closed disclosure flow resolves to a zero-height row', async () => {
  expect(await resolve(flowContext(), 'grid-template-rows')).toBe('0fr');
});

test('an open disclosure flow resolves to a full row', async () => {
  expect(await resolve(flowContext({ open: '' }), 'grid-template-rows')).toBe('1fr');
});

test(`a closing disclosure flow resolves back to a zero-height row`, async () => {
  expect(
    await resolve(flowContext({ open: '', [CLOSING_ATTRIBUTE]: '' }), 'grid-template-rows'),
  ).toBe('0fr');
});

test('the disclosure inner selector itself declares no padding at all', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const innerRules = stylesheet.rules.filter((rule) => isUnconditionalInnerSubject(rule.selector));
  const declaringOnInner = innerRules.filter((rule) =>
    PADDING_PROPERTIES.some((property) => rule.declarations.has(property)),
  );

  expect(innerRules.length).toBeGreaterThan(0);
  expect(declaringOnInner.map((rule) => rule.selector)).toEqual([]);
});

test('a closed disclosure inner contributes no height at rest', async () => {
  /*
   * The invariant this guards is about HEIGHT, not about every axis at once: the
   * close animates the row to `0fr`, so any block padding inside the panel would
   * leave a residual band under a disclosure that is supposed to be shut.
   */
  expect(await resolve(innerContext(), 'padding-block')).toBeNull();
});

test('an open disclosure inner keeps its block padding', async () => {
  expect(await resolve(innerContext({ open: '' }), 'padding-block')).toBe('.2rem .85rem');
});

test('a collapsing disclosure inner releases its block padding', async () => {
  const closing = innerContext({ open: '', [CLOSING_ATTRIBUTE]: '' });

  expect(await resolve(closing, 'padding-block')).toBe('0');
});

test('the disclosure flow reserves the closing state in its own utility', async () => {
  const css = await readSource('../../src/styles/global.css');
  const utility = css.slice(
    css.indexOf('@utility disclosure-flow {'),
    css.indexOf('@utility disclosure-flow-inner {'),
  );

  expect(utility).toContain(`details[open]:not([${CLOSING_ATTRIBUTE}]) > &`);
  expect(utility).toContain('grid-template-rows: 0fr;');
  expect(utility).toContain('grid-template-rows: 1fr;');
  expect(utility).not.toContain('details[open] > &');
});

test('the compiled stylesheet ships both disclosure row states', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  // Scope to the disclosure-flow utility. Unrelated `grid-rows-[…]` utilities
  // generated from other sources must not affect this assertion.
  const rowRules = stylesheet.rules.filter(
    (rule) =>
      rule.declarations.has('grid-template-rows') && rule.selector.includes('.disclosure-flow'),
  );

  expect(rowRules.map((rule) => rule.declarations.get('grid-template-rows'))).toEqual([
    '0fr',
    '1fr',
  ]);
  expect(
    rowRules.some((rule) => rule.selector.includes(`details[open]:not([${CLOSING_ATTRIBUTE}])`)),
  ).toBe(true);
});

test('every disclosure chevron snaps to its closed form while closing', async () => {
  const [css, ...astroSources] = await Promise.all([
    readSource('../../src/styles/global.css'),
    ...DISCLOSURE_ASTRO_SOURCES.map((path) => readSource(path)),
  ]);

  expect(css).toMatch(
    new RegExp(`details\\[${CLOSING_ATTRIBUTE}\\] \\.disclosure-icon \\{[^}]*rotate: 0deg;`, 'su'),
  );

  for (const source of astroSources) {
    expect(source).toContain('disclosure-icon');
    expect(source).toContain('group-open:rotate-45');
  }
});

/*
 * The old component drew its marker as two CSS pseudo-element bars rotating
 * from `+` to `x` via `summary::before` / `summary::after`. That glyph was dead
 * (it only existed under `.prose details`, matched by nothing) and it duplicated
 * the authored SVG chevron every component already ships. DESIGN.md also
 * forbids substituting a glyph where an authored SVG belongs. These assertions
 * keep it gone.
 */
test('no CSS-glyph disclosure marker is reintroduced', async () => {
  const css = await readSource('../../src/styles/global.css');
  expect(css).not.toContain('summary::before');
  expect(css).not.toContain('summary::after');
});

test('no summary rule keys off the open state without exempting the closing state', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const summaryRules = stylesheet.rules.filter((rule) => rule.selector.includes('summary'));

  expect(summaryRules.length).toBeGreaterThan(0);
  for (const rule of summaryRules) {
    for (const selector of rule.selector.split(',')) {
      if (!selector.includes('[open]')) {
        continue;
      }
      expect(selector).toContain(`:not([${CLOSING_ATTRIBUTE}])`);
    }
  }
});

test('a closing disclosure icon resolves to the closed rotation', async () => {
  expect(await resolve(iconContext({ open: '', [CLOSING_ATTRIBUTE]: '' }), 'rotate')).toBe('0deg');
});

test('the closed icon rotation is one unlayered rule that no closed icon can match', async () => {
  const closing = await iconRotationRules({ open: '', [CLOSING_ATTRIBUTE]: '' });
  const settled = await iconRotationRules({});

  expect(closing).toHaveLength(1);
  expect(closing[0].selector).toBe(`details[${CLOSING_ATTRIBUTE}] .disclosure-icon`);
  expect(closing[0].layer).toBeNull();
  expect(closing[0].declarations.get('rotate')).toBe('0deg');
  expect(settled).toHaveLength(0);
});

test('every disclosure icon animates open on the collapse curve', async () => {
  const astroSources = await Promise.all(DISCLOSURE_ASTRO_SOURCES.map((path) => readSource(path)));
  let icons = 0;

  for (const source of astroSources) {
    const found = matchesOf(source, /class="[^"]*disclosure-icon[^"]*"/gu);

    /*
     * The count used to be pinned to exactly one per file, which is a proxy for
     * "a file cannot grow a second disclosure without that second one being
     * checked". The header now genuinely ships two — the section list and the
     * reading preferences — so the pin had become a false alarm and the real
     * assertion, the four classes below, is what has to hold for every icon in
     * every file. A non-zero total still fails if a component loses its icon.
     */
    expect(found.length).toBeGreaterThanOrEqual(1);
    for (const icon of found) {
      expect(icon).toContain('group-open:rotate-45');
      expect(icon).toContain('transition-transform');
      expect(icon).toContain('duration-[280ms]');
      expect(icon).toContain('motion-reduce:transition-none');
    }
    icons += found.length;
  }

  expect(icons).toBeGreaterThanOrEqual(DISCLOSURE_ASTRO_SOURCES.length);
});

test('the summary glyph and the flow collapse share one transition duration', async () => {
  const css = await readSource('../../src/styles/global.css');
  const flow = css.slice(
    css.indexOf(`@utility ${FLOW_CLASS} {`),
    css.indexOf(`@utility ${FLOW_CLASS}-inner {`),
  );
  const glyph = css.slice(
    css.indexOf('details::details-content {'),
    css.indexOf('details[open]::details-content {'),
  );
  const collapse = /transition: grid-template-rows (\d+)ms/u.exec(flow)?.[1];
  const glyphDuration = /translate (\d+)ms/u.exec(glyph)?.[1];

  expect(collapse).toBeDefined();
  expect(glyphDuration).toBe(collapse);
});

test('disclosure flow, inner, and closing literals agree across controller, rehype, and CSS', async () => {
  const [controller, rehype, css] = await Promise.all([
    readSource('../../src/lib/disclosure-controller.mjs'),
    readSource('../../src/lib/rehype-disclosures.mjs'),
    readSource('../../src/styles/global.css'),
  ]);

  expect(FLOW_CLASS).toBe('disclosure-flow');
  expect(CLOSING_ATTRIBUTE).toBe('data-disclosure-closing');
  expect(controller).toContain(`FLOW_CLASS = '${FLOW_CLASS}'`);
  expect(controller).toContain(`CLOSING_ATTRIBUTE = '${CLOSING_ATTRIBUTE}'`);
  expect(controller).toContain(`details.setAttribute?.(CLOSING_ATTRIBUTE, '')`);
  expect(controller).toContain(`details.removeAttribute?.(CLOSING_ATTRIBUTE)`);
  expect(rehype).toContain(`['disclosure-content', '${FLOW_CLASS}']`);
  expect(rehype).toContain(`['disclosure-content-inner', '${FLOW_CLASS}-inner']`);
  expect(css).toContain(`@utility ${FLOW_CLASS} {`);
  expect(css).toContain(`@utility ${FLOW_CLASS}-inner {`);
  expect(css).toContain(`details[open]:not([${CLOSING_ATTRIBUTE}]) > &`);
  expect(css).toContain(`details[${CLOSING_ATTRIBUTE}] .disclosure-icon`);
  expect(css).toContain(`details[open]:not([${CLOSING_ATTRIBUTE}]) > summary`);
  expect(css).toContain('details.disclosure,');
  expect(css).toContain('.prose details {');
});
