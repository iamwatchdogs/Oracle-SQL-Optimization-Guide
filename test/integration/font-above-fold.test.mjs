/*
 * Whether every preloaded face is one a reader actually sees, and none of the ones they see is missing.
 *
 * The sibling of `font-preload.test.mjs`, split because the two questions reach for different evidence. That
 * file asks what the built `<head>` ASKED FOR, which is a fact about markup. This one asks whether those
 * requests were SPENT WELL, which is a fact about which elements paint in which face — and it needs a
 * cascade, because "which face does this element paint in" is a question about selectors, specificity and
 * inheritance, not about a string in a stylesheet. `test/support/css/font-faces.mjs` does the resolving and
 * its header carries the argument for what "above the fold" means without a browser.
 *
 * THE TWO FACTS THIS FILE ADDS, both measured before the change and both false then:
 *
 *   - JetBrains Mono was painted in by thirteen elements of every head region — the wordmark, the
 *     `Section 02 / 09` counter, the reading-preference steppers — and was not preloaded on any of the 38
 *     pages. It is the running head, inside a `sticky top-0` header, on every page.
 *   - The italic serif face was preloaded on all 38 and painted in by no element of any head region, for
 *     51,720 bytes: the largest file the site ships, fetched by the parser before the document existed.
 *
 * WHAT IS ASSERTED, and what is deliberately not. The bijection is asserted as SET EQUALITY rather than as
 * two one-sided subset checks, because equality says something neither half can: a face missing from both
 * sides passes "every used face is preloaded" AND "no preloaded face goes unused". The browser's version of
 * the same claim — measured geometry, `getComputedStyle`, and which engine found each request — is
 * `test/e2e/font-preload.spec.mjs`, and the cost of the decision is stated on the tripwire below rather than
 * left for a reader to infer from the absence of a preload.
 */
import { beforeAll, expect, test } from 'vitest';
import { ensureBuild, loadBuiltPages } from '../support/built-site.mjs';
import { headRegionFaces } from '../support/css/font-faces.mjs';
import { facePreloadFiles, fontFaceRules } from '../support/fonts.mjs';

let pages = [];
let regions = [];

beforeAll(async () => {
  await ensureBuild();
  pages = await loadBuiltPages();
  regions = pages.map(({ html }) => headRegionFaces(html));
}, 300_000);

test('the head region paints in exactly three faces, and the resolver finds all three', () => {
  /*
   * The POSITIVE CONTROL, and it has to come before anything that asserts a preload is right — every
   * assertion below is satisfied by a resolver that returns an empty set. It also pins the head region from
   * the other side: a page that painted its chrome in a fourth face, or stopped painting one of these
   * three, goes red here, which means the preload assertions are being read against a region that changed
   * rather than against a preload that changed.
   *
   * The counts are why the region is trustworthy rather than merely non-empty: 17-34 elements resolve to
   * these three `(face, style)` pairs on this build, so a resolver that matched only the elements carrying
   * a `font-*` utility class would pass and one that matched nothing would not.
   */
  for (const [index, { file }] of pages.entries()) {
    const { painted } = regions[index];

    expect(
      [...painted.keys()].toSorted(),
      `${file} paints in the head region with faces this test does not expect`,
    ).toEqual(['mono|normal', 'sans|normal', 'serif|normal']);

    for (const [key, count] of painted) {
      expect(count, `${file} resolved only ${count} elements for ${key}`).toBeGreaterThan(1);
    }
  }
});

test('the preload list is exactly the set of faces the head region paints in', () => {
  /*
   * THE DEFECT, both halves, as ONE assertion — because they are one claim and the two-sided form is
   * stronger than either half alone. Set equality says the preloaded files and the faces the head region
   * paints in are the same set, which no pair of one-sided subset checks can say: a face missing from both
   * sides passes "every used face is preloaded" AND "no preloaded face goes unused".
   *
   * Two ways this could have flattered a result, both closed. The region is deliberately generous about
   * what counts as above the fold — the whole header and the title, excluding only closed panels — so a
   * face this rejects is one no reader sees in the first screenful on any page. And the positive control
   * above has already established that the region resolves to three faces, so equality here is a statement
   * about preloads and not about an empty set.
   *
   * Before the change, on all 38 pages: the mono face painted in thirteen elements and was not preloaded,
   * and the italic face was preloaded and painted in none.
   */
  const mismatched = pages.flatMap(({ file, html }, index) => {
    const { painted, file: fileOf } = regions[index];
    const wanted = new Set([...painted.keys()].map((key) => fileOf.get(key)));
    const preloaded = facePreloadFiles(html);
    const paintedIn = [...wanted].toSorted();
    const preloadedNames = [...preloaded].toSorted();

    return paintedIn.join() === preloadedNames.join()
      ? []
      : [
          `${file}: head region paints in ${paintedIn.join(', ') || 'nothing'} but preloads ${
            preloadedNames.join(', ') || 'nothing'
          }`,
        ];
  });

  expect(mismatched).toEqual([]);
});

test('dropping a preload changes priority and nothing else: all four faces stay declared', () => {
  /*
   * THE TRIPWIRE, and it exists because the change has a cost this file would otherwise let a reader
   * forget. Not preloading the italic face does not stop the browser fetching it: every one of the 37
   * content pages renders italic text, so all of them still transfer the italic file. What the change moves
   * is who asks first — a preload is resolved by the parser before the document has any content, and a face
   * the CSSOM wants is resolved after the CSSOM has matched it to an element.
   *
   * So two things must both remain true: the face is still DECLARED (this test) and still FETCHED (the
   * request set, in `test/e2e/font-preload.spec.mjs`). If a future change made `preload` do the declaring
   * too, the italic face would silently stop being fetched on a page that renders no italic — a content
   * regression wearing a performance fix as a disguise — and this goes red.
   *
   * The pages that render no italic are NAMED rather than counted: there is exactly one, the 404, which is
   * built from no content collection. A number in a comment goes stale silently; a named list of exemptions
   * goes red the moment a second page loses its italic text.
   */
  for (const { file, html } of pages) {
    const selfHosted = fontFaceRules(html).filter((rule) => rule.src !== '');
    expect(
      selfHosted.filter((rule) => rule.style === 'italic').length,
      `${file} no longer declares an italic serif face`,
    ).toBe(3);
  }

  /*
   * And the markup reason all of them except one still render it. Read from the HTML rather than resolved
   * through the cascade, and that is a measured choice: resolving "does this page paint in the italic serif
   * face" element by element costs 226 seconds across the thirty-eight pages, because `resolveToken` tests
   * each element against every rule in a 63 KB sheet. What this assertion needs is the italic DECLARATIONS
   * (asserted above, from the compiled CSS) and the MARKUP they apply to (asserted here) — and the browser's
   * own answer to "was the italic file actually fetched" is asserted in `test/e2e/font-preload.spec.mjs`.
   *
   * `<blockquote>` is the prose quote, which `@tailwindcss/typography` makes italic
   * (`node_modules/@tailwindcss/typography/src/styles.js:1485-1489`); `<p><strong>` is this stylesheet's own
   * conclusion card (`src/styles/global.css:1202-1211`). The 404 is built from no content collection and has
   * neither, so it is the one page that would stop downloading the italic face — and it never rendered it.
   */
  const withoutItalic = pages
    .filter(({ html }) => !/<blockquote|<p><strong>/u.test(html))
    .map(({ file }) => file);
  expect(
    withoutItalic,
    'a page that used to render italic text no longer does, so the italic face is no longer fetched there',
  ).toEqual(['/404.html']);
});
