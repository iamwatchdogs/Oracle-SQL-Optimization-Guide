/*
 * The route swap's compositing contract, as the stylesheet states it.
 *
 * Split from `design-metadata.test.mjs`, which covers the palette and the type tokens.
 * These are about the one mechanism the swap rests on, and each of them was got wrong
 * at least once in a way that no test here would have caught:
 *
 *   1. Every zone is a template directive, so Astro scopes it. A zone named from a
 *      stylesheet is on for every navigation.
 *   2. Every half of every zone is declared. A half that is not declared falls through
 *      to Astro's default, which carries `mix-blend-mode: plus-lighter`.
 *   3. No arriving half animates its opacity. The zones leave top-down and arrive
 *      bottom-up, so a staggered arrival leaves the middle of the swap with nothing
 *      painted at all — the page is simply absent for a quarter of a second, and no
 *      combination of delays avoids it.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

/** The stylesheet with its prose removed, so a comment can never satisfy an assertion. */
const stripComments = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

/**
 * Every zone is a template directive, and therefore Astro-scoped.
 *
 * A zone named from a stylesheet is on for every navigation, which is how the heading
 * ended up a zone on a section jump it should never have been. The title stopped being
 * a zone altogether — it lives inside the reading column, which is painted from the
 * first frame, so a second snapshot of the same pixels sat on the first.
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
 * Every half is declared, and no arriving half withholds its snapshot.
 *
 * A half that is not declared falls through to Astro's default, which carries
 * `plus-lighter` — the defect the root pseudo was fixed for, and the same one the
 * title's old half had. An arriving half that animates its opacity is the defect that
 * made every direction read as broken: the zones leave top-down and arrive bottom-up,
 * so the ones that leave first are absent longest and those windows stack, leaving the
 * middle of the swap with nothing painted at all.
 */
test('every half is declared, and no arriving half animates opacity', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));
  const zones = ['rh', 'rail', 'body', 'body-home', 'pager-prev', 'pager-next', 'meta'];

  for (const side of ['old', 'new']) {
    for (const zone of zones) {
      expect(global, `no ${side} half declared for ${zone}`).toMatch(
        new RegExp(`::view-transition-${side}\\(${zone}\\)`, 'u'),
      );
    }
  }
  /*
   * `body` is excluded: it is the one arriving half that carries an animation, because
   * the pager hop's rise is a transform on an already-painted snapshot. Every other
   * arriving half must declare no animation at all. The zones are enumerated rather
   * than pattern-matched, so `root` — which is pinned to a zero-duration fill and
   * carries `animation` deliberately — is not swept up by a wildcard.
   */
  for (const zone of zones.filter((name) => name !== 'body')) {
    const rule = new RegExp(`::view-transition-new\\(${zone}\\)[^{]*\\{([^}]*)\\}`, 'u').exec(
      global,
    );
    expect(rule, `no arriving half declared for ${zone}`).not.toBeNull();
    expect(rule[1], `${zone} animates its arrival, so the page can go blank`).not.toMatch(
      /animation/u,
    );
  }
});

/**
 * The pager hop's rise, which is the one thing that still animates on arrival.
 *
 * A transform moves a painted snapshot, so it is safe; an opacity animation withholds
 * one, so it is not. This is written bare and selected by `--zone-in-body`, because a
 * qualified `html[data-nav='pager'] ::view-transition-new(body)` does not match the
 * view-transition pseudo tree and Astro's own fade wins.
 */
test('the pager rise is transform-only and reached by a custom property', async () => {
  const global = stripComments(await readRepoFile('src/styles/global.css'));

  expect(global).toMatch(/::view-transition-new\(body\)[^{]*\{[^}]*var\(--zone-in-body\)/u);
  expect(global).toMatch(/--zone-in-body: none;/u);
  expect(global).toMatch(/html\[data-nav='pager'\] \{[^}]*--zone-in-body: zone-rise;/u);

  const rise = /@keyframes zone-rise \{([\s\S]*?)\n\}/u.exec(global);
  expect(rise, 'the pager hop no longer has a rise').not.toBeNull();
  expect(rise[1], 'the pager rise animates opacity').not.toMatch(/opacity/u);
});
