/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p2.mjs`
 */
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';
import { parseCompiledStylesheet } from '../../src/lib/css-cascade.mjs';
const css = await compileProjectStylesheet();
const sheet = parseCompiledStylesheet(css);
console.log('=== every compiled rule that declares `rotate` ===');
for (const r of sheet.rules.filter((r) => r.declarations.has('rotate'))) {
  console.log(
    `layer=${r.layer ?? '(unlayered)'}  order=${r.order}\n  selector=${r.selector}\n  rotate=${r.declarations.get('rotate')}`,
  );
}
console.log('\n=== every compiled rule whose selector mentions :is( or :where( ===');
for (const r of sheet.rules.filter(
  (r) => r.selector.includes(':is(') || r.selector.includes(':where('),
)) {
  console.log(`  ${r.selector}`);
}
console.log('\n=== unlayered rules (layer === null) ===');
for (const r of sheet.rules.filter((r) => r.layer === null)) console.log(`  ${r.selector}`);
