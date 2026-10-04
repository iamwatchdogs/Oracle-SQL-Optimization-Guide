import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  resolveToken,
  ruleMatches,
  selectorsDeclaring,
} from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';
import { CLOSING_ATTRIBUTE } from '../../src/lib/disclosure-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const compiled = compileProjectStylesheet();
const css = readSource('../../src/styles/global.css');

/*
 * The `::details-content` fallback is the no-JavaScript collapse path. It is
 * scoped to the `details` element, NOT to `.prose details`: the three shipped
 * disclosures (site nav, evidence key, mobile table of contents) all sit
 * outside the article body, so a `.prose` prefix meant the fallback reached
 * nothing and a no-JS close could leave a full-height gap in a real panel.
 */
const detailsContentRule = (stylesheet) =>
  stylesheet.rules.find(
    (rule) => rule.selector === 'details::details-content' && rule.declarations.has('translate'),
  ) ?? null;

const openDetailsContentRule = (stylesheet) =>
  stylesheet.rules.find(
    (rule) =>
      rule.selector === 'details[open]::details-content' &&
      rule.layer === null &&
      rule.declarations.get('translate') === '0',
  ) ?? null;

const overlayContext = () => ({
  types: ['div'],
  classes: [
    'absolute',
    'right-0',
    'z-50',
    'max-[48rem]:static',
    'max-[48rem]:mt-2',
    'max-[48rem]:w-full',
    'disclosure-flow',
  ],
  ancestors: [
    { types: ['div'], classes: ['disclosure-flow-inner'] },
    { types: ['details'], classes: ['group', 'relative', 'ml-auto'] },
    { types: ['div'], classes: ['mx-auto', 'flex', 'h-12', 'w-shell'] },
    { types: ['header'], classes: ['sticky', 'top-0', 'z-40'] },
    { types: ['body'] },
  ],
});

const proseFlowContext = () => ({
  types: ['div'],
  classes: ['disclosure-content', 'disclosure-flow'],
  ancestors: [
    { types: ['details'], classes: ['group'] },
    { types: ['article'], classes: ['prose'] },
  ],
});

const proseFlowWithOpen = (attributes = {}) => ({
  types: ['div'],
  classes: ['disclosure-content', 'disclosure-flow'],
  ancestors: [
    { types: ['details'], attributes, children: [{}] },
    { types: ['article'], classes: ['prose'] },
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

const proseInnerContext = (detailsAttributes = {}) => ({
  classes: ['disclosure-content-inner', 'disclosure-flow-inner'],
  ancestors: [
    { types: ['div'], classes: ['disclosure-flow'] },
    { types: ['details'], attributes: detailsAttributes },
    { types: ['article'], classes: ['prose'] },
  ],
});

test('the native details-content fallback declares the closed transform-only state', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = detailsContentRule(stylesheet);

  expect(rule).not.toBeNull();
  expect(rule?.declarations.get('translate')).toBe('0 -.35rem');
  expect(rule?.declarations.has('opacity')).toBe(false);
});

test('the native details-content fallback forces the open state at rest', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = openDetailsContentRule(stylesheet);

  expect(rule).not.toBeNull();
  expect(rule?.declarations.get('translate')).toBe('0');
  expect(rule?.declarations.has('opacity')).toBe(false);
});

test('the open native details-content fallback is gated on the open attribute', async () => {
  const source = await css;

  expect(source).toContain('details[open]::details-content {');
  expect(source).not.toMatch(/details::details-content\s*\{[^}]*opacity/u);
});

test('the native details-content fallback keeps content visible when open', async () => {
  const source = await css;

  expect(source).not.toMatch(/details\[open\]::details-content\s*\{[^}]*display:\s*none/u);
  expect(source).not.toMatch(
    /details\[open\]::details-content\s*\{[^}]*content-visibility:\s*hidden/u,
  );
  expect(source).not.toMatch(/@starting-style[^}]*details\[open\]::details-content/su);
});

test('the native details-content fallback transitions content-visibility discretely', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const rule = detailsContentRule(stylesheet);
  const transition = rule?.declarations.get('transition') ?? '';

  expect(transition).toContain('translate');
  // This discrete content-visibility transition is load-bearing: it keeps the
  // subtree rendered while the grid row animates to 0fr, which is what lets a
  // no-JS close actually collapse instead of snapping to a full-height gap.
  expect(transition).toContain('content-visibility');
  expect(transition).toContain('allow-discrete');
  expect(transition).not.toContain('opacity');
});

test('the native details-content fallback reaches every disclosure, not just prose ones', async () => {
  const [source, stylesheet] = await Promise.all([css, parseCompiledStylesheet(await compiled)]);

  // The regression this replaces asserted the OPPOSITE: that the fallback was
  // scoped to `.prose details` and that no unscoped rule existed. Since no
  // shipped disclosure lives inside `.prose`, that contract guaranteed the
  // no-JS collapse path was dead for all three real accordions.
  expect(source).toContain('details::details-content {');
  expect(source).toContain('details[open]::details-content {');
  expect(source).not.toContain('.prose details::details-content');

  const unscoped = stylesheet.rules.filter(
    (rule) => rule.selector === 'details::details-content' && rule.declarations.has('translate'),
  );
  expect(unscoped).toHaveLength(1);
  expect(unscoped[0].layer).toBeNull();
});

test('the mobile site-nav panel joins the header flow instead of overlaying the viewport', async () => {
  const [layout, stylesheet] = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    parseCompiledStylesheet(await compiled),
  ]);

  /*
   * A `<details>` establishes a containing block for its non-summary children
   * REGARDLESS of `position` — Chrome wraps them in `::details-content`, whose
   * `content-visibility` implies `contain: layout paint size`. So a panel
   * positioned `fixed` or `absolute` from inside one resolves `left`, `right` and
   * `width` against the ~104px summary box, not the viewport. Measured: the
   * overlay was 71.78px wide at x=234 and ran 358px off a 390px screen.
   *
   * Nothing positioned from inside a `<details>` can overlay the viewport, so
   * below `48rem` the panel is `static` and joins the header's wrapping flow,
   * and the disclosure is `static` too so the full-width row owns the layout.
   */
  expect(layout).not.toContain('prose');
  /* `<details\b[^>]*class="`, not `<details class="`: the shorter form coupled
     the assertion to attribute ORDER, which Prettier decides. */
  expect(layout).toMatch(/<details\b[^>]*class="[^"]*max-\[48rem\]:static[^"]*"/u);
  expect(layout).toMatch(/<div\b[^>]*class="[^"]*max-\[48rem\]:static[^"]*disclosure-flow/u);
  expect(layout).not.toMatch(/max-\[48rem\]:fixed/u);

  // Nothing may translate or transform the panel: a transform would additionally
  // re-establish a containing block and re-break the geometry.
  const translateRules = stylesheet.rules.filter(
    (rule) => rule.declarations.has('translate') && !rule.declarations.has('opacity'),
  );
  const trapping = translateRules.filter((rule) =>
    ruleMatches(rule.selector, createContext(overlayContext())),
  );

  expect(trapping).toEqual([]);
  expect(await resolveToken(await compiled, overlayContext(), 'translate')).toBeNull();
  expect(await resolveToken(await compiled, overlayContext(), 'transform')).toBeNull();
  expect(await resolveToken(await compiled, proseFlowContext(), 'translate')).toBeNull();
});

test('the prose disclosure flow still relies on the grid height controller', async () => {
  expect(await resolveToken(await compiled, proseFlowWithOpen(), 'grid-template-rows')).toBe('0fr');
  expect(
    await resolveToken(await compiled, proseFlowWithOpen({ open: '' }), 'grid-template-rows'),
  ).toBe('1fr');
});

test('the reduced-motion override still neutralizes the native fallback', async () => {
  const source = await css;
  const media = source.slice(source.indexOf('@media (prefers-reduced-motion: reduce)'));
  const block = media.slice(media.indexOf('{'), media.indexOf('}'));

  expect(block).toContain('details::details-content');
  expect(block).toContain('transition: none !important');
});

test('the grid controller remains the precise height path', async () => {
  const source = await css;
  const utility = source.slice(
    source.indexOf('@utility disclosure-flow {'),
    source.indexOf('@utility disclosure-flow-inner {'),
  );

  expect(utility).toContain(`details[open]:not([${CLOSING_ATTRIBUTE}]) > &`);
  expect(utility).toContain('grid-template-rows: 0fr;');
  expect(utility).toContain('grid-template-rows: 1fr;');
});

test('the disclosure inner transitions its padding release on close', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const inner = stylesheet.rules.find(
    (rule) => rule.selector === '.disclosure-content-inner' && rule.declarations.has('transition'),
  );
  const transition = inner?.declarations.get('transition') ?? '';

  expect(transition).toContain('padding-block');
});

test('the closed disclosure inner still rests at exactly zero padding', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const paddingProperties = [
    'padding',
    'padding-block',
    'padding-inline',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ];
  const declaringOnInner = selectorsDeclaring(stylesheet, paddingProperties).filter((rule) =>
    ruleMatches(rule.selector, createContext(innerContext())),
  );

  /*
   * The only unconditional padding declaration that reaches a closed inner is
   * Tailwind's preflight reset (`* { padding: 0 }`, base layer). Nothing in the
   * disclosure component itself may set padding outside an `[open]` /
   * `[data-disclosure-closing]` gate — that is what makes the close collapse
   * instead of leaving a residual gap.
   *
   * This assertion used to read `toEqual([])`, which passed only because the
   * selector matcher treated the reset's `*, :after, :before, ::backdrop` list
   * as one unmatchable chain.
   */
  expect(declaringOnInner.map((rule) => rule.selector)).toEqual(['*, :after, :before, ::backdrop']);
  expect(
    declaringOnInner.every(
      (rule) => rule.layer === 'base' && rule.declarations.get('padding') === '0',
    ),
  ).toBe(true);
  expect(resolveToken(await compiled, innerContext(), 'padding-block')).toBeNull();
  expect(resolveToken(await compiled, innerContext(), 'padding')).toBe('0');
});

test('an open disclosure inner keeps its block padding and a closing one releases it', async () => {
  const open = innerContext({ open: '' });
  const closing = innerContext({ open: '', [CLOSING_ATTRIBUTE]: '' });

  expect(resolveToken(await compiled, open, 'padding-block')).toBe('.2rem .85rem');
  expect(resolveToken(await compiled, closing, 'padding-block')).toBe('0');
});

test('a prose disclosure inner behaves the same as a component disclosure inner', async () => {
  // `.prose details` and `details.disclosure` share one framed treatment, so an
  // authored content disclosure must not need a second set of rules.
  expect(resolveToken(await compiled, proseInnerContext({ open: '' }), 'padding-block')).toBe(
    '.2rem .85rem',
  );
  expect(
    resolveToken(
      await compiled,
      proseInnerContext({ open: '', [CLOSING_ATTRIBUTE]: '' }),
      'padding-block',
    ),
  ).toBe('0');
});
