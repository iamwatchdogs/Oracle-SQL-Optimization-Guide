/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p4.mjs`
 */
const R = new URL('../../src/lib/', import.meta.url).href;
const { compileProjectStylesheet } = await import(R + 'tailwind-compile.mjs');
const { parseCompiledStylesheet, resolveToken, ruleMatches, createContext } = await import(
  R + 'css-cascade.mjs'
);

const css = await compileProjectStylesheet();
const sheet = parseCompiledStylesheet(css);

console.log('=== compiled rules mentioning disclosure-flow (the @utility expansion) ===');
for (const r of sheet.rules.filter((r) => r.selector.includes('disclosure-flow'))) {
  console.log(`  layer=${r.layer ?? '(unlayered)'}  ${r.selector}`);
  for (const [k, v] of r.declarations) console.log(`      ${k}: ${v}`);
}

const flowCtx = (a = {}) =>
  createContext({
    classes: ['disclosure-flow'],
    ancestors: [
      { types: ['details'], attributes: a, children: [{}] },
      { types: ['div'], classes: ['prose'] },
    ],
  });
const innerCtx = (a = {}) =>
  createContext({
    classes: ['disclosure-content-inner', 'disclosure-flow-inner'],
    ancestors: [
      { types: ['div'], classes: ['disclosure-flow'] },
      { types: ['details'], attributes: a },
      { types: ['div'], classes: ['prose'] },
    ],
  });

const r = (ctx, p) => resolveToken(css, ctx, p);
console.log('\n=== resolveToken results (what the tests assert) ===');
console.log(
  'closed flow grid-template-rows   :',
  r(flowCtx(), 'grid-template-rows'),
  "  (test: '0fr')",
);
console.log(
  'open   flow grid-template-rows   :',
  r(flowCtx({ open: '' }), 'grid-template-rows'),
  "  (test: '1fr')",
);
console.log(
  'closing flow grid-template-rows :',
  r(flowCtx({ open: '', 'data-disclosure-closing': '' }), 'grid-template-rows'),
  "  (test: '0fr')",
);
console.log('closed inner padding-block      :', r(innerCtx(), 'padding-block'), '  (test: null)');
console.log(
  'open   inner padding-block      :',
  r(innerCtx({ open: '' }), 'padding-block'),
  "  (test: '.75rem .85rem')",
);
console.log(
  'closing inner padding-block     :',
  r(innerCtx({ open: '', 'data-disclosure-closing': '' }), 'padding-block'),
  "  (test: '.75rem .85rem')",
);

console.log('\n=== which rules the matcher credits for grid-template-rows ===');
for (const [label, ctx] of [
  ['closed', flowCtx()],
  ['open', flowCtx({ open: '' })],
  ['closing', flowCtx({ open: '', 'data-disclosure-closing': '' })],
]) {
  const hit = sheet.rules.filter(
    (x) => x.declarations.has('grid-template-rows') && ruleMatches(x.selector, ctx),
  );
  console.log(`  ${label}: ${hit.map((x) => x.selector).join(' | ') || '(none)'}`);
}
