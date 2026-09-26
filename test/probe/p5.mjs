/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p5.mjs`
 */
const R = new URL('../../src/lib/', import.meta.url).href;
const { compileProjectStylesheet } = await import(R + 'tailwind-compile.mjs');
const { parseCompiledStylesheet, resolveToken, ruleMatches, createContext } = await import(
  R + 'css-cascade.mjs'
);
const css = await compileProjectStylesheet();
const sheet = parseCompiledStylesheet(css);

const flowDef = (a = {}) => ({
  classes: ['disclosure-flow'],
  ancestors: [
    { types: ['details'], attributes: a, children: [{}] },
    { types: ['div'], classes: ['prose'] },
  ],
});
const innerDef = (a = {}) => ({
  classes: ['disclosure-content-inner', 'disclosure-flow-inner'],
  ancestors: [
    { types: ['div'], classes: ['disclosure-flow'] },
    { types: ['details'], attributes: a },
    { types: ['div'], classes: ['prose'] },
  ],
});

console.log('=== resolveToken (correct usage: plain definition) ===');
console.log(
  'closed flow grid-template-rows   :',
  resolveToken(css, flowDef(), 'grid-template-rows'),
  "  test: '0fr'",
);
console.log(
  'open   flow grid-template-rows   :',
  resolveToken(css, flowDef({ open: '' }), 'grid-template-rows'),
  "  test: '1fr'",
);
console.log(
  'closing flow grid-template-rows :',
  resolveToken(css, flowDef({ open: '', 'data-disclosure-closing': '' }), 'grid-template-rows'),
  "  test: '0fr'",
);
console.log(
  'closed inner padding-block      :',
  resolveToken(css, innerDef(), 'padding-block'),
  '  test: null',
);
console.log(
  'open   inner padding-block      :',
  resolveToken(css, innerDef({ open: '' }), 'padding-block'),
  "  test: '.75rem .85rem'",
);
console.log(
  'closing inner padding-block     :',
  resolveToken(css, innerDef({ open: '', 'data-disclosure-closing': '' }), 'padding-block'),
  "  test: '.75rem .85rem'",
);

console.log('\n=== which rules the matcher credits (correct usage) ===');
for (const [label, def] of [
  ['closed', flowDef()],
  ['open', flowDef({ open: '' })],
  ['closing', flowDef({ open: '', 'data-disclosure-closing': '' })],
]) {
  const ctx = createContext(def);
  const hit = sheet.rules.filter(
    (x) => x.declarations.has('grid-template-rows') && ruleMatches(x.selector, ctx),
  );
  console.log(`  ${label}: ${hit.map((x) => x.selector).join(' | ') || '(none)'}`);
}

console.log('\n=== does the matcher ever credit the Tailwind group-open rotate rule? ===');
const iconDef = (a = {}) => ({
  types: ['svg'],
  classes: ['disclosure-icon'],
  ancestors: [
    { types: ['summary'] },
    { types: ['details'], classes: ['group'], attributes: a },
    { types: ['div'], classes: ['prose'] },
  ],
});
const twSel = '.group-open\\:rotate-45:is(:where(.group):is([open], :popover-open, :open) *)';
for (const a of [{}, { open: '' }, { open: '', 'data-disclosure-closing': '' }]) {
  console.log(
    `  attrs=${JSON.stringify(a).padEnd(42)} matches=${ruleMatches(twSel, createContext(iconDef(a)))}`,
  );
}
console.log('  -> the layered rotate-45 rule is NEVER credited, because parseCompound mangles the');
console.log(
  '     escaped class into {kind:"class",name:"group-open\\\\"} plus {kind:"state"} (always false).',
);
console.log('\n=== unlayered closing rule still credited? ===');
for (const a of [{ open: '', 'data-disclosure-closing': '' }, {}]) {
  const ctx = createContext(iconDef(a));
  const hit = sheet.rules.filter(
    (x) => x.declarations.has('rotate') && ruleMatches(x.selector, ctx),
  );
  console.log(
    `  attrs=${JSON.stringify(a).padEnd(42)} -> ${hit.map((x) => `${x.selector} (layer=${x.layer})`).join(' | ') || '(none)'}`,
  );
}
