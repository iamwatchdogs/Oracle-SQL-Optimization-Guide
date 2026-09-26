/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p6.mjs`
 */
const R = new URL('../../src/lib/', import.meta.url).href;
const { compileProjectStylesheet } = await import(R + 'tailwind-compile.mjs');
const { parseCompiledStylesheet } = await import(R + 'css-cascade.mjs');
const sheet = parseCompiledStylesheet(await compileProjectStylesheet());

console.log('=== transition-property declarations in the compiled sheet ===');
for (const r of sheet.rules.filter((x) => x.declarations.has('transition-property'))) {
  console.log(
    `  ${r.selector}\n      transition-property: ${r.declarations.get('transition-property')}`,
  );
}
console.log('\n=== motion-reduce:transition-none ===');
for (const r of sheet.rules.filter((x) => x.selector.includes('motion-reduce'))) {
  console.log(`  ${r.selector} -> ${[...r.declarations].map(([k, v]) => `${k}:${v}`).join('; ')}`);
}
console.log('\n=== group-open:rotate-45 declaration block ===');
for (const r of sheet.rules.filter((x) => x.selector.includes('rotate-45'))) {
  console.log(`  ${r.selector} -> ${[...r.declarations].map(([k, v]) => `${k}:${v}`).join('; ')}`);
}
console.log('\n=== duration-[280ms] ===');
for (const r of sheet.rules.filter((x) => x.selector.includes('280ms'))) {
  console.log(`  ${r.selector} -> ${[...r.declarations].map(([k, v]) => `${k}:${v}`).join('; ')}`);
}
