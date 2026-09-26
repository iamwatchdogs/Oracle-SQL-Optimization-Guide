import { parseCompiledStylesheet, createContext } from '../../src/lib/css-cascade.mjs';
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';

/**
 * PROBE — dumps the Tailwind preflight reset that reaches a disclosure inner.
 *
 * Origin: `test/integration/disclosure-native-fallback.test.mjs` failed with
 * `expected [ '*, :after, :before, ::backdrop' ] to deeply equal []` once
 * `src/lib/css-selectors.mjs` learned to match comma-separated selector lists.
 * The matcher had been treating that list as one unmatchable chain, so the
 * preflight reset had been invisible to the audit tooling for the whole life of
 * the suite. This probe shows what the rule actually declares so the assertion
 * can be written against reality rather than a guess.
 */
const sheet = parseCompiledStylesheet(await compileProjectStylesheet());

const context = createContext({
  classes: ['disclosure-content-inner', 'disclosure-flow-inner'],
  ancestors: [
    { types: ['div'], classes: ['disclosure-flow'] },
    { types: ['details'], classes: ['disclosure'] },
    { types: ['div'], classes: ['w-shell'] },
  ],
});

for (const rule of sheet.rules) {
  if (rule.selector === '*, :after, :before, ::backdrop') {
    console.log(
      JSON.stringify(
        {
          selector: rule.selector,
          layer: rule.layer,
          declarations: Object.fromEntries(rule.declarations),
        },
        null,
        1,
      ),
    );
  }
}
