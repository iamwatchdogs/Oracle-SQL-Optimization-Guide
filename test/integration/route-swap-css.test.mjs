/*
 * The route swap's source-level contract, as the stylesheet states it.
 *
 * These are about the one mechanism the swap rests on, and each of them was got wrong
 * at least once in a way that no test here would have caught:
 *
 *   1. Every zone is a template directive, so Astro scopes it. A zone named from a
 *      stylesheet is on for every navigation.
 *   2. Every half of every zone is declared. A half that is not declared falls through
 *      to Astro's default, which carries `mix-blend-mode: plus-lighter`.
 *   3. The two ladders are DERIVED from four numbers rather than typed out, so the
 *      arrival cannot drift away from the departure and the dead beat cannot silently
 *      become zero.
 *
 * Point 3 is the one worth reading the rest for. The choreography is two staggers and
 * a pause between them, and the pause is what makes it read as a page changing. Written
 * as fourteen independent delays it is fourteen chances to move one of them and lose the
 * relationship that is the entire effect — which is exactly what happened when the swap
 * was retimed from 190ms to 240ms and the entrance ladder kept its old numbers.
 *
 * These are source-level checks on purpose: they read the stylesheet's own text, so they
 * hold whether or not a browser is available to run. `route-transition.spec.mjs` proves
 * the resolved result in a real browser, and neither test can do the other's job.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

/** The stylesheet with its prose removed, so a comment can never satisfy an assertion. */
const stripComments = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

/** Every zone that a route swap names, in the order a jump reads the page. */
const ZONES = ['rh', 'rail', 'body', 'body-home', 'pager-prev', 'pager-next', 'meta'];

const escapeRegExp = (literal) => literal.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

/**
 * The declaration block of one view-transition pseudo, comments already stripped.
 *
 * The selector is anchored to a line ending in `(` and a word so that `body` cannot
 * match the opening of `body-home`, and so that the seven zones are read one at a time
 * rather than as a run of adjacent rules.
 */
const ruleBody = (css, selector) => {
  const rule = new RegExp(`^${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'mu').exec(css);
  return rule?.[1] ?? null;
};

/**
 * Every zone is a template directive, and therefore Astro-scoped.
 *
 * A zone named from a stylesheet is on for every navigation. The heading is not a zone
 * at all: it lives inside the reading column, which is a zone, so naming it separately
 * would put a second snapshot of the same pixels on top of the first for the length of
 * the swap — a ghost that only the swap can produce.
 */
test('no zone is named from a stylesheet', async () => {
  const [slug, global] = await Promise.all([
    readRepoFile('src/pages/[...slug].astro'),
    readRepoFile('src/styles/global.css'),
  ]);

  expect(global).not.toMatch(/view-transition-name/u);
  expect(global).not.toMatch(/--zone-title/u);
  expect(slug).not.toMatch(/transition:name="(page-)?title"/u);
});

/**
 * Every half of every zone is declared.
 *
 * A half that is not declared falls through to Astro's default, which carries
 * `plus-lighter` — the defect the root pseudo was fixed for, and the same one the
 * title's old half had. This is checked for both directions because the arrival is
 * half of every zone's identity, not a bonus: a swap where the pieces leave in an
 * order and come back in another is the entire effect, and it needs both halves to
 * exist before either order means anything.
 */
test('both halves of every zone are declared', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));

  for (const side of ['old', 'new']) {
    for (const zone of ZONES) {
      expect(global, `no ${side} half declared for ${zone}`).toMatch(
        new RegExp(`::view-transition-${side}\\(${zone}\\)`, 'u'),
      );
    }
  }
});

/**
 * The arrival is choreographed, not merely declared.
 *
 * Each arriving half resolves its own delay and its own keyframes through the two
 * inherited custom properties, so this is one shape repeated seven times. Checking the
 * shape rather than the values is what makes the pager variant expressible at all: the
 * pager and the jump share a rule and differ only in what `--zone-in-body` resolves to,
 * so an assertion that hard-coded one keyframe name would forbid the other variant.
 */
test('every arriving half resolves a delay and a keyframe by custom property', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));

  for (const zone of ZONES) {
    const body = ruleBody(global, `::view-transition-new(${zone})`);
    expect(body, `no arriving half declared for ${zone}`).not.toBeNull();
    expect(body, `${zone} has a hard-coded arrival delay`).not.toMatch(/(?<!-)\b\d+ms\b/u);
    expect(body, `${zone} does not delay its arrival`).toContain(`var(--zone-enter-${zone})`);
    expect(body, `${zone} does not name its own arrival keyframes`).toContain(
      `var(--zone-in-${zone})`,
    );
    /* `both` fill, or the pseudo reverts to its resting style during the dead beat. */
    expect(body, `${zone} does not hold its arrival through the dead beat`).toMatch(/\bboth\b/u);
    /* New underneath, old on top, stated on both halves rather than inherited. */
    expect(body, `${zone} does not state its paint order`).toMatch(/z-index:\s*1/u);
  }
});

/**
 * The two ladders are derived from four numbers, so they cannot fall out of step.
 *
 * `--zone-stagger` positions both ladders, `--zone-dur` closes the departure, and
 * `--zone-beat` is the silence between them. The arrival ladder is written as an
 * offset from `--zone-enter-base`, which is the last exit's end plus the beat — so the
 * one property that makes the choreography a pause rather than an overlap is on both
 * sides of the arithmetic, and editing a delay out of order can no longer produce a
 * swap where the new page starts arriving before the old one has finished leaving.
 */
test('the arrival ladder is derived from the departure, the beat, and the stagger', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));

  expect(global).toMatch(/--zone-stagger:\s*45ms;/u);
  expect(global).toMatch(/--zone-beat:\s*70ms;/u);
  expect(global).toMatch(
    /--zone-enter-base:\s*calc\(4 \* var\(--zone-stagger\) \+ var\(--zone-dur\) \+ var\(--zone-beat\)\);/u,
  );

  expectLaddersAreDerived(global);
  expectArrivalsAreOffsetsOfTheBase(global);
  expectCoexistingZonesHaveDistinctOffsets(global);
});

/**
 * Both ladders are built from the shared numbers rather than typed out.
 *
 * Every exit delay is a whole number of staggers, except the running head's, which is the
 * first piece and therefore starts at zero. `rh` is spelled `0ms` rather than
 * `calc(0 * var(--zone-stagger))` because writing the first step as arithmetic on nothing
 * reads as a placeholder, and there is nothing there to compute.
 */
function expectLaddersAreDerived(global) {
  for (const zone of ZONES) {
    expect(global, `${zone} has a typed-out exit delay`).toMatch(
      new RegExp(`--zone-exit-${zone}:\\s*(?:0ms|calc\\(|var\\()`, 'u'),
    );
    expect(global, `${zone} has no derived arrival delay`).toMatch(
      new RegExp(`--zone-enter-${zone}:\\s*(?:var\\(--zone-enter-base\\)|calc\\()`, 'u'),
    );
  }
}

/**
 * Every arrival is the base, or the base plus a whole number of staggers.
 *
 * A delay that is neither is a delay somebody will eventually tune to sit between two
 * other pieces, which is the one thing a reverse ordering cannot survive — it puts an
 * arrival inside the dead beat and the beat stops being a beat.
 */
function expectArrivalsAreOffsetsOfTheBase(global) {
  const offsetOf = (zone) =>
    new RegExp(`--zone-enter-${zone}:\\s*([^;]+);`, 'u').exec(global)[1].trim();

  const derivedFromBase =
    /^var\(--zone-enter-base\)$|^calc\(var\(--zone-enter-base\) \+ (?:var\(--zone-stagger\)|\d+ \* var\(--zone-stagger\))\)$/u;

  for (const zone of ZONES) {
    expect(offsetOf(zone), `${zone}'s arrival is not derived from the base`).toMatch(
      derivedFromBase,
    );
  }
}

/**
 * The five zones that coexist on a section page must have DISTINCT offsets.
 *
 * A tie puts two pieces on the same frame and the staircase becomes a pair — invisible
 * at 240ms and obvious at 60ms.
 *
 * `body-home` and `meta` are home-only and share an offset with `body` deliberately: they
 * never coexist with it, and on a jump out of the home page they are the two pieces that
 * leave together and come back together, which is what a title block and the margin
 * beside it should do.
 */
function expectCoexistingZonesHaveDistinctOffsets(global) {
  const sectionPage = ['pager-next', 'pager-prev', 'body', 'rail', 'rh'].map((zone) =>
    new RegExp(`--zone-enter-${zone}:\\s*([^;]+);`, 'u').exec(global)[1].trim(),
  );

  expect(
    new Set(sectionPage).size,
    `two zones on a section page share an arrival offset: ${sectionPage.join(' ')}`,
  ).toBe(sectionPage.length);
}

/**
 * The dead beat is real, and it is the only reason the swap has two ladders.
 *
 * A pause exists precisely because nothing is scheduled in it, so the way to lose one
 * is not to set it to zero — it is to set the arrival delays close enough to the exits
 * that the pause disappears in practice. Asserting that `--zone-beat` is non-zero is
 * cheap; the arithmetic above, which puts every arrival offset on top of it, is the
 * part that actually holds.
 */
test('the dead beat is non-zero and named where the ladders can both see it', async () => {
  const css = stripComments(await readRepoFile('src/styles/global.css'));
  const beat = /--zone-beat:\s*(\d+)ms;/u.exec(css);

  expect(beat, 'the dead beat is not expressed in milliseconds').not.toBeNull();
  expect(Number(beat[1]), 'the dead beat is zero, so the two ladders overlap').toBeGreaterThan(0);
});

/**
 * Nothing composites additively, on either half.
 *
 * The UA adds the two opacities of `::view-transition-old/new(root)`, and Astro's own
 * fades bake `plus-lighter` into theirs, so the snapshots are added rather than drawn
 * over one another. Addition is correct only while the two opacities sum to 1 — and in
 * the dead beat they sum to zero, so those frames render as paper showing through this
 * `#0c0c0e` page. The property has to be stated per keyframe rather than merely left
 * alone, because the UA applies its blend as a second animation that no declaration
 * here would otherwise reach.
 */
test('every zone keyframe states mix-blend-mode: normal on both stops', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));
  const zoneKeyframes = [
    'zone-out',
    'zone-out-left',
    'zone-out-right',
    'zone-in',
    'zone-in-left',
    'zone-in-right',
    'zone-in-up',
  ];

  for (const name of zoneKeyframes) {
    const match = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`, 'u').exec(global);
    expect(match, `@keyframes ${name} is missing`).not.toBeNull();

    const stops = match[1].split(/\bfrom\b|\bto\b/u).filter((stop) => stop.trim().length > 0);
    expect(stops, `${name} does not have a from/to pair`).toHaveLength(2);

    for (const stop of stops) {
      expect(stop, `${name} leaves a keyframe open to the UA blend`).toMatch(
        /mix-blend-mode:\s*normal/u,
      );
    }
  }
});

/**
 * The pager hop rises into place, and the jump does not.
 *
 * This is the whole difference between the two variants, so it is expressed the way the
 * stylesheet expresses it: one bare rule on `::view-transition-new(body)` reading an
 * inherited `--zone-in-body`, and one qualified block on `<html>` overriding it. A
 * qualified `html[data-nav='pager'] ::view-transition-new(body)` would not match the
 * view-transition pseudo tree at all — those pseudo-elements hang off the document
 * element, not off `<html>`'s box — so it parses, reaches the CSSOM, and never applies,
 * and Astro's own fade wins.
 */
test('the pager variant differs from the jump only in the arrival keyframes', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));

  expect(global).toMatch(/--zone-in-body:\s*zone-in;/u);
  expect(global).toMatch(/html\[data-nav='pager'\] \{[^}]*--zone-in-body: zone-in-up;/u);

  const rise = /@keyframes zone-in-up \{([\s\S]*?)\n\}/u.exec(global);
  expect(rise, 'the pager hop no longer has a rise').not.toBeNull();
  /* It rises off the vertical axis, and it dissolves — a piece that is merely there
   * through the dead beat is not participating in it. */
  expect(rise[1], 'the pager rise does not travel vertically').toMatch(
    /translateY\(calc\(-1 \* var\(--zone-drop\)\)\)/u,
  );
  expect(rise[1], 'the pager rise is transform-only, so it cannot leave the beat').toMatch(
    /opacity/u,
  );

  /* And the jump's own arrival keyframes hold still rather than travel. */
  const plain = /@keyframes zone-in \{([\s\S]*?)\n\}/u.exec(global);
  expect(plain, 'the jump arrival no longer dissolves in place').not.toBeNull();
  expect(
    plain[1],
    'the jump arrival travels, so the jump is not distinct from the pager',
  ).not.toMatch(/transform/u);
});
