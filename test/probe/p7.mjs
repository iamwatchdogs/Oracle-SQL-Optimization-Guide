/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p7.mjs`
 */
const R = new URL('../../src/lib/', import.meta.url).href;
const { compileProjectStylesheet } = await import(R + 'tailwind-compile.mjs');
const { parseCompiledStylesheet } = await import(R + 'css-cascade.mjs');
const sheet = parseCompiledStylesheet(await compileProjectStylesheet());
console.log('=== compiled rules that key off [open] WITHOUT the closing exemption ===');
for (const r of sheet.rules) {
  for (const sel of r.selector.split(',')) {
    if (
      sel.includes('[open]') &&
      !sel.includes('[data-disclosure-closing]') &&
      !sel.includes(':is(')
    ) {
      console.log(
        `  ${sel}\n      -> ${[...r.declarations].map(([k, v]) => `${k}:${v}`).join('; ')}`,
      );
    }
  }
}
