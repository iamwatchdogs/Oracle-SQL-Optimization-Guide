import { expect, test } from 'vitest';
import {
  compareSpecificity,
  createContext,
  ruleMatches,
  specificityOf,
  splitSelector,
} from '../../test/support/css/css-cascade.mjs';

const matches = (selector, definition) => ruleMatches(selector, createContext(definition));

const proseParent = { types: ['div'], classes: ['prose'] };
const insideProse = (details, prose) => ({
  classes: ['disclosure-content-inner'],
  ancestors: [details, prose ?? proseParent],
});

const strongOnlyChild = { types: ['strong'] };
const otherChild = { types: ['em'] };

test('splitSelector keeps the combinator attached to its compound', () => {
  expect(splitSelector('div > p')).toEqual([
    { combinator: null, compound: 'div' },
    { combinator: '>', compound: 'p' },
  ]);
  expect(splitSelector('div p')).toEqual([
    { combinator: null, compound: 'div' },
    { combinator: ' ', compound: 'p' },
  ]);
  expect(splitSelector('a + b ~ c')).toEqual([
    { combinator: null, compound: 'a' },
    { combinator: '+', compound: 'b' },
    { combinator: '~', compound: 'c' },
  ]);
});

test('splitSelector does not treat functional pseudo arguments as compounds', () => {
  const parts = splitSelector('.prose > p:has( > strong:only-child)');

  expect(parts.map((part) => part.compound)).toEqual(['.prose', 'p:has( > strong:only-child)']);
  expect(parts.map((part) => part.combinator)).toEqual([null, '>']);
});

test('recognizes a :has(> strong:only-child) selector', () => {
  const selector = '.prose > p:has( > strong:only-child)';
  const withStrongOnly = {
    types: ['p'],
    classes: ['takeaway'],
    ancestors: [{ types: ['div'], classes: ['prose'] }],
    children: [strongOnlyChild],
  };

  expect(matches(selector, withStrongOnly)).toBe(true);
  expect(matches(selector, { ...withStrongOnly, children: [otherChild] })).toBe(false);
  expect(matches(selector, { ...withStrongOnly, children: [strongOnlyChild, otherChild] })).toBe(
    false,
  );
  expect(matches(selector, { ...withStrongOnly, children: [] })).toBe(false);
});

test('distinguishes a :has child argument from a :has descendant argument', () => {
  const nested = {
    types: ['p'],
    ancestors: [{ types: ['div'], classes: ['prose'] }],
    children: [{ types: ['em'], children: [strongOnlyChild] }],
  };

  expect(matches('.prose > p:has( > strong)', nested)).toBe(false);
  expect(matches('.prose > p:has(strong)', nested)).toBe(true);
  expect(matches('.prose > p:has( > em)', nested)).toBe(true);
});

test('recognizes an :is(...) selector against any of its arguments', () => {
  const heading = { types: ['h2'], ancestors: [{ types: ['div'], classes: ['prose'] }] };

  expect(matches('.prose :is(h2, h3)', heading)).toBe(true);
  expect(matches('.prose :is(h1, h3)', heading)).toBe(false);
  expect(matches('.prose :is(h2, h3)', { types: ['h3'], ancestors: heading.ancestors })).toBe(true);
});

test('recognizes attribute arguments inside :not() and :is()', () => {
  const open = { types: ['details'], attributes: { open: '' } };
  const closing = {
    types: ['details'],
    attributes: { open: '', 'data-disclosure-closing': '' },
  };
  const closed = { types: ['details'] };
  const stateSelector = 'details[open]:not([data-disclosure-closing])';
  const paddingSelector =
    '.prose details:is([open], [data-disclosure-closing]) .disclosure-content-inner';

  expect(matches(stateSelector, open)).toBe(true);
  expect(matches(stateSelector, closing)).toBe(false);
  expect(matches(stateSelector, closed)).toBe(false);
  expect(specificityOf(stateSelector)).toEqual([0, 2, 1]);

  expect(matches(paddingSelector, insideProse(open))).toBe(true);
  expect(matches(paddingSelector, insideProse(closing))).toBe(true);
  expect(matches(paddingSelector, insideProse(closed))).toBe(false);
  expect(matches(paddingSelector, insideProse(closed, { types: ['div'] }))).toBe(false);
  expect(specificityOf(paddingSelector)).toEqual([0, 3, 1]);
});

test('recognizes :is() over class and attribute arguments', () => {
  const element = {
    types: ['div'],
    classes: ['prose', 'keep'],
    ancestors: [{ types: ['html'], attributes: { 'data-theme': 'dark' } }],
  };

  expect(matches('[data-theme=dark] :is(.keep, .drop)', element)).toBe(true);
  expect(matches('[data-theme=dark] :is(.drop, .gone)', element)).toBe(false);
  expect(matches('[data-theme=light] :is(.keep, .drop)', element)).toBe(false);
});

test('specificity aggregates every compound, not only the first', () => {
  expect(specificityOf('html .prose')).toEqual([0, 1, 1]);
  expect(specificityOf('.prose')).toEqual([0, 1, 0]);
  expect(specificityOf('#main .prose .keep')).toEqual([1, 2, 0]);
  expect(specificityOf('html > body .prose')).toEqual([0, 1, 2]);
});

test('html .prose outranks a single-class selector', () => {
  const specificity = specificityOf('html .prose');
  const singleClass = specificityOf('.prose');

  expect(compareSpecificity(specificity, singleClass)).toBeGreaterThan(0);
  expect(compareSpecificity(singleClass, specificity)).toBeLessThan(0);
});

test('a child combinator adds no specificity of its own', () => {
  expect(specificityOf('div > p')).toEqual(specificityOf('div p'));
  expect(specificityOf('.prose > p')).toEqual([0, 1, 1]);
});

test('functional pseudo-classes contribute their most specific argument', () => {
  expect(specificityOf('.prose :is(h2, .keep)')).toEqual([0, 2, 0]);
  expect(specificityOf('.prose :not(h2)')).toEqual([0, 1, 1]);
  expect(specificityOf('.prose :where(#ignored, .also-ignored)')).toEqual([0, 1, 0]);
  expect(specificityOf('.prose p:has( > strong:only-child)')).toEqual([0, 2, 2]);
});

test('a child combinator must not be satisfied by a distant ancestor', () => {
  const definition = {
    types: ['p'],
    ancestors: [{ types: ['div'], classes: ['prose'] }, { types: ['section'] }],
  };

  expect(matches('.prose > p', definition)).toBe(true);
  expect(matches('section > p', definition)).toBe(false);
  expect(matches('section > div > p', definition)).toBe(true);
});

test('a descendant combinator is satisfied by any ancestor, not only the parent', () => {
  const definition = {
    types: ['p'],
    ancestors: [{ types: ['div'], classes: ['prose'] }, { types: ['section'] }],
  };

  expect(matches('section p', definition)).toBe(true);
  expect(matches('section > p', definition)).toBe(false);
  expect(matches('body p', definition)).toBe(false);
});

test('ancestors[0] is the immediate parent', () => {
  const definition = {
    types: ['p'],
    ancestors: [{ types: ['span'] }, { types: ['div'], classes: ['prose'] }],
  };

  expect(matches('span > p', definition)).toBe(true);
  expect(matches('.prose > p', definition)).toBe(false);
  expect(matches('.prose p', definition)).toBe(true);
});

test('existing selector helpers still treat plain compounds as before', () => {
  const definition = {
    types: ['div'],
    classes: ['prose'],
    ancestors: [{ types: ['html'], attributes: { 'data-theme': 'dark' } }],
  };

  expect(matches('.prose', definition)).toBe(true);
  expect(matches('[data-theme=dark] .prose', definition)).toBe(true);
  expect(matches('[data-theme=light] .prose', definition)).toBe(false);
  expect(matches(':root', { types: ['html'], classes: [] })).toBe(true);
  expect(matches('.prose:not(.gone)', definition)).toBe(true);
  expect(specificityOf('.prose[data-x]')).toEqual([0, 2, 0]);
});
