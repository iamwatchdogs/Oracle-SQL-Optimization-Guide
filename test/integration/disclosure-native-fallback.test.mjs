import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  createContext,
  parseCompiledStylesheet,
  resolveToken,
  ruleMatches,
  selectorsDeclaring,
} from '../../src/lib/css-cascade.mjs';
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';
import { CLOSING_ATTRIBUTE } from '../../src/lib/disclosure-controller.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const compiled = compileProjectStylesheet();
const css = readSource('../../src/styles/global.css');

const detailsContentRule = (stylesheet) =>
  stylesheet.rules.find(
    (rule) =>
      rule.selector === '.prose details::details-content' && rule.declarations.has('translate'),
  ) ?? null;

const openDetailsContentRule = (stylesheet) =>
  stylesheet.rules.find(
    (rule) =>
      rule.selector === '.prose details[open]::details-content' &&
      rule.layer === 'components' &&
      rule.declarations.get('translate') === '0',
  ) ?? null;

const overlayContext = () => ({
  types: ['div'],
  classes: [
    'absolute',
    'right-0',
    'z-50',
    'max-[48rem]:fixed',
    'max-[48rem]:top-16',
    'max-[48rem]:right-4',
    'max-[48rem]:left-4',
    'max-[48rem]:w-auto',
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
    { types: ['details'], attributes: detailsAttributes },
    { types: ['div'], classes: ['prose'] },
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

  expect(source).toContain('.prose details[open]::details-content {');
  expect(source).not.toMatch(/\.prose details::details-content\s*\{[^}]*opacity/u);
});

test('the native details-content fallback keeps content visible when open', async () => {
  const source = await css;

  expect(source).not.toMatch(/\.prose details\[open\]::details-content\s*\{[^}]*display:\s*none/u);
  expect(source).not.toMatch(
    /\.prose details\[open\]::details-content\s*\{[^}]*content-visibility:\s*hidden/u,
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

test('the native details-content fallback is scoped to prose disclosures only', async () => {
  const [source, stylesheet] = await Promise.all([css, parseCompiledStylesheet(await compiled)]);

  expect(source).toContain('.prose details::details-content {');
  expect(source).toContain('.prose details[open]::details-content {');
  expect(source).not.toMatch(/^\s*details::details-content\s*\{/mu);
  expect(source).not.toMatch(/^\s*details\[open\]::details-content\s*\{/mu);

  const unscoped = stylesheet.rules.filter(
    (rule) => rule.selector === 'details::details-content' && rule.declarations.has('translate'),
  );
  expect(unscoped).toEqual([]);
});

test('the mobile site-nav fixed overlay is not inside a translated pseudo containing block', async () => {
  const [layout, stylesheet] = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    parseCompiledStylesheet(await compiled),
  ]);

  expect(layout).not.toContain('prose');
  expect(layout).toMatch(/class="[^"]*max-\[48rem\]:fixed[^"]*disclosure-flow"/u);

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
  expect(block).toContain('.prose details::details-content');
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
  const inner = stylesheet.rules.find((rule) =>
    rule.selector.includes('.prose details .disclosure-content-inner'),
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

  expect(declaringOnInner.map((rule) => rule.selector)).toEqual([]);
  expect(resolveToken(await compiled, innerContext(), 'padding-block')).toBeNull();
});

test('an open disclosure inner keeps its 12px/13.6px padding and a closing one releases it', async () => {
  const open = innerContext({ open: '' });
  const closing = innerContext({ open: '', [CLOSING_ATTRIBUTE]: '' });

  expect(resolveToken(await compiled, open, 'padding-block')).toBe('.75rem .85rem');
  expect(resolveToken(await compiled, closing, 'padding-block')).toBe('0');
});
