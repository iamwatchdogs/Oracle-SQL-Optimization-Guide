/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p3.mjs`
 */
const R = new URL('../../src/lib/', import.meta.url).href;
const { ruleMatches, createContext } = await import(R + 'css-selectors.mjs');
const { splitSelector, parseCompound } = await import(R + 'css-compounds.mjs');

const icon = (attrs) =>
  createContext({
    types: ['svg'],
    classes: ['disclosure-icon'],
    ancestors: [
      { types: ['summary'] },
      { types: ['details'], classes: ['group'], attributes: attrs },
      { types: ['div'], classes: ['prose'] },
    ],
  });

const cases = [
  [
    'details[data-disclosure-closing] .disclosure-icon',
    { open: '', 'data-disclosure-closing': '' },
  ],
  ['details[open]:not([data-disclosure-closing]) > .disclosure-flow', { open: '' }],
  ['details[open] > .disclosure-flow', { open: '' }],
  ['.prose details:is([open], [data-disclosure-closing]) .disclosure-content-inner', { open: '' }],
  [
    '.prose details:is([open], [data-disclosure-closing]) .disclosure-content-inner',
    { 'data-disclosure-closing': '' },
  ],
  ['.prose details .disclosure-content-inner', {}],
  ['.group-open\\:rotate-45:is(:where(.group):is([open], :popover-open, :open) *)', { open: '' }],
  ['.prose details summary::before', { open: '' }],
  ['.prose :where(p):not(:where([class~="not-prose"], [class~="not-prose"] *))', {}],
];
console.log('selector'.padEnd(72), 'attrs'.padEnd(38), 'matches');
for (const [sel, attrs] of cases) {
  console.log(
    sel.slice(0, 70).padEnd(72),
    JSON.stringify(attrs).padEnd(38),
    ruleMatches(sel, icon(attrs)),
  );
}

console.log('\n=== how parseCompound tokenizes the Tailwind group-open selector ===');
const parts = splitSelector(
  '.group-open\\:rotate-45:is(:where(.group):is([open], :popover-open, :open) *)',
);
for (const p of parts) {
  console.log(' combinator:', JSON.stringify(p.combinator));
  console.log('  compound parts:', JSON.stringify(parseCompound(p.compound), null, 1));
}
console.log('\n=== how parseCompound tokenizes ::before and :where ===');
console.log(JSON.stringify(parseCompound('summary::before')));
console.log(JSON.stringify(parseCompound(':where(.group)')));
console.log(JSON.stringify(parseCompound('[class~="not-prose"]')));
