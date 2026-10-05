/*
 * Where the route swap's zones are declared in the source.
 *
 * This is the one question about the swap that is a question about the TEMPLATES rather
 * than about the stylesheet: which element carries which name.
 *
 * That distinction is load-bearing. Every assertion elsewhere in the swap's suite — the
 * ladders, the dead beat, the compositing, the coverage — was green while the swap was
 * visibly broken, because a `view-transition-name` on the wrong element produces a
 * choreography that runs perfectly. The only thing that can catch it is looking at the
 * element.
 */
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

/**
 * Template source with its comments stripped.
 *
 * Load-bearing twice over. A rationale that quotes `transition:name="…"` verbatim would
 * otherwise satisfy the very pattern meant to prove a declaration is absent, and would be
 * counted as a second declaration by the zone count — which is exactly what happened when
 * the `body-home` note was written.
 */
const markup = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

/** Every route template that can carry a `transition:name`. */
const ZONE_TEMPLATES = [
  'src/pages/[...slug].astro',
  'src/pages/404.astro',
  'src/components/HomeTitleBlock.astro',
  'src/components/PrevNext.astro',
];

/**
 * The zone names the route templates declare, comments stripped.
 *
 * The count is the point of this test and it has to count what the browser sees, so the
 * stripping is not optional tidiness.
 */
const readDeclaredZones = async () => {
  const sources = await Promise.all(ZONE_TEMPLATES.map((path) => readRepoFile(path)));
  const names = [];

  for (const source of sources) {
    for (const [, name] of markup(source).matchAll(/transition:name="([\w-]+)"/gu)) {
      names.push(name);
    }
  }

  return { sources, names };
};

test('the route swap names its zones, and names them explicitly', async () => {
  /*
   * Every zone is an explicit `transition:name`, never a `transition:animate`.
   *
   * This used to assert three `fade({ duration: '0.18s' })` calls — one per `<main>` across
   * the two route templates. There is no `fade()` left: the swap is a per-zone stagger now,
   * and `fade()` writes `plus-lighter` into its own keyframes, which a staggered sequence
   * cannot composite. Every zone is named instead, so the choreography in `global.css` can
   * reach it by name.
   *
   * The count is the part that must not drift, and it is not a proxy for anything else. A
   * zone that quietly loses its name stops taking part in the stagger, which is invisible in
   * review and obvious on screen.
   */
  const { sources, names } = await readDeclaredZones();

  /* `body` on the two section templates — the catch-all's section branch and the 404's —
     and `body-home` on the home page: the home column is 1152px at x=64 and a section's is
     824px at x=392, so one shared name asks the browser to morph one into the other and it
     slides the page 328px to do it. */
  expect(names.filter((name) => name === 'body')).toHaveLength(2);
  expect(names.filter((name) => name === 'body-home')).toHaveLength(1);
  for (const zone of ['rh', 'rail', 'meta', 'pager-prev', 'pager-next']) {
    expect(names, `zone ${zone} is not named in any template`).toContain(zone);
  }

  /* No `fade()` and no `transition:animate` anywhere in the routes: a re-introduced
     animation would write `plus-lighter` back over the zone choreography. */
  for (const source of sources) {
    expect(source).not.toMatch(/transition:animate/u);
    expect(source).not.toMatch(/from 'astro:transitions'/u);
  }
  /* The layout declares none either — it owns the router, not the zones. */
  expect(markup(await readRepoFile('src/layouts/BaseLayout.astro'))).not.toMatch(
    /transition:(animate|name|persist)/u,
  );
});

test('the home zone is on a wrapper, not on the below-the-fold main', async () => {
  /*
   * The count above cannot see WHICH element carries a name, and that is what broke.
   *
   * `body-home` was on the home page's `<main>`, which holds only the prose at y=1535. The
   * title block, the abstract, the primary control and the nine-row contents list are that
   * element's SIBLINGS, so 93% of the first viewport fell into `root` — which is pinned at
   * opacity 1 — and the home page painted at full strength from t=0 of a section→home swap,
   * underneath a section page still coming apart. A section page's `<main>` does hold its
   * whole reading column, which is why only that one direction showed it.
   *
   * So the name has to sit on something that contains the title block, and the cheapest
   * source-level check is that the element naming it is not a `<main>`. The rendered
   * counterpart — that the display heading really is inside the zone — is
   * `route-transition-coverage.spec.mjs`, because only a browser can answer it.
   */
  const slug = markup(await readRepoFile('src/pages/[...slug].astro'));
  const named = /<(\w+)[^>]*\btransition:name="body-home"/u.exec(slug);

  expect(named, 'the home page names no element body-home').not.toBeNull();
  expect(
    named[1],
    'body-home is back on a <main>, which on the home page is only the prose below the fold',
  ).not.toBe('main');
});
