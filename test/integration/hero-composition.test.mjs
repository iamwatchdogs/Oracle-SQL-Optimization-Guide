import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/*
 * The hero's exemption from the reader's text size, enforced at the source level.
 *
 * This exists because the fix is a piece of indirection that no behavioural test
 * can hold onto. `--type-display` is declared on `:root` as
 * `calc(<base> * var(--type-scale))`, and a custom property's `var()` references
 * are substituted where the property is DECLARED — so setting `--type-scale: 1`
 * on a descendant changes nothing at all, because the inherited value was already
 * resolved. The hero only stops scaling because the ramp tokens are RE-DECLARED
 * at its own scope, referencing `-base` twins that hold the authored value.
 *
 * Every one of those four things can be removed by a well-meaning refactor and
 * leave the page looking fine: the hero goes back to scaling, nothing errors, and
 * the e2e test that covers it is one of several that would need re-running. This
 * test reads the stylesheet instead.
 */

const STYLESHEET = fileURLToPath(new URL('../../src/styles/global.css', import.meta.url));
const css = readFileSync(STYLESHEET, 'utf8');

/** The block of declarations belonging to one selector. */
const declarationsFor = (selector) => {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
  const match = new RegExp(`^${escaped} \\{([^}]*)\\}`, 'mu').exec(css);
  return match?.[1] ?? null;
};

/*
 * Exactly the steps the home hero renders, and the reason the list is not all
 * fourteen: these are the tokens `--type-display`, `--type-abstract`,
 * `--type-ui` (the primary control and the evidence-key summary), `--type-mono`
 * (the metadata margin) and `--type-chip` (its grade chips) resolve to. A token
 * with no opted-out scope needs no `-base` twin.
 */
const HERO_TOKENS = [
  '--type-display',
  '--type-abstract',
  '--type-ui',
  '--type-mono',
  '--type-chip',
];

const read = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const root = declarationsFor(':root');
const hero = declarationsFor('.hero-composition');

describe('the hero composition', () => {
  test('the stylesheet has both blocks, and the hero freezes the scale', () => {
    expect(root).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(hero).toMatch(/--type-scale:\s*1\s*;/u);
  });

  test('a token with no opted-out scope has no -base twin', () => {
    /*
     * The other side of the boundary. A `-base` twin with no consumer is
     * indirection for its own sake, and there are nine of them available to add by
     * accident.
     */
    for (const token of ['--type-title', '--type-h2', '--type-body', '--type-contribution']) {
      expect(root).not.toMatch(new RegExp(`${token}-base:`, 'u'));
    }
  });

  test('the two em-relative steps stay em-relative and unscaled', () => {
    expect(root).toMatch(/--type-citation:\s*0\.8125em\s*;/u);
    expect(root).toMatch(/--type-annotation:\s*0\.875em\s*;/u);
  });
});

/*
 * The two assertions that matter, one pair per token the hero renders, generated
 * outside any `describe` so the list is data rather than a wall of near-identical
 * blocks.
 */
for (const token of HERO_TOKENS) {
  test(`${token} keeps its authored value in a -base twin`, () => {
    /*
     * The twin is what makes the hero's re-declaration a re-multiplication rather
     * than a second copy of the ramp. If a refactor inlines the value, the hero
     * becomes the only place the number is written and the two can drift.
     */
    expect(root).toMatch(new RegExp(`${token}-base:\\s*[^;]+;`, 'u'));
    expect(root).toMatch(
      new RegExp(
        `${token}:\\s*calc\\(var\\(${token}-base\\)\\s*\\*\\s*var\\(--type-scale\\)\\);`,
        'u',
      ),
    );
  });

  test(`${token} is re-evaluated at the hero's own scale`, () => {
    /*
     * The line that does the work. Drop it and the hero silently rejoins the
     * scale, because the inherited value was resolved at `:root`.
     */
    expect(hero).toMatch(
      new RegExp(
        `${token}:\\s*calc\\(var\\(${token}-base\\)\\s*\\*\\s*var\\(--type-scale\\)\\);`,
        'u',
      ),
    );
  });
}

describe('the hero marks its own scope in the templates', () => {
  test('the real hero section carries it', () => {
    const block = read('../../src/components/HomeTitleBlock.astro');
    expect(block).toMatch(/<section\s[^>]*class="[^"]*\bhero-composition\b[^"]*"/u);
    expect(block).toMatch(/aria-labelledby="book-title"/u);
  });
});
