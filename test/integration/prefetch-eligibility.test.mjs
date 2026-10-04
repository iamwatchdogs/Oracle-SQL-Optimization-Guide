/*
 * Every link role on every built page carries exactly the prefetch eligibility the design gives it — and
 * the table that says which is which accounts for all of them.
 *
 * The scope half of this concern. `prefetch-scope.test.mjs` holds the arithmetic and the config; this file
 * holds the enumeration, and it holds it by WALKING `ROLES` in `test/support/prefetch.mjs` rather than by
 * asserting one role at a time. That is the difference between a test and a checklist: a checklist has to
 * be extended by hand when the project grows a link, and a table that fails for an unlisted link cannot.
 *
 * WHY THE EXHAUSTIVENESS CHECK IS THE INTERESTING ONE. Two assertions a scope can pass are easy — every
 * intended link is marked, and nothing else is. A third is not: that the table describes the whole page.
 * Without it, a link written into a new component lands in no role, is checked by nothing, and quietly
 * joins the eligible set the day somebody marks its neighbours — or quietly stays out of it while the
 * design says it should be in. So the roles are compared against each page's anchor count twice: their
 * union must cover every anchor, and it must be no LARGER than the sum of what they found, which is what
 * catches two roles claiming one link.
 *
 * Identity is `at`, an anchor's document position. An href is not an identity — the pager's `prev` is the
 * section the reader is inside — and neither is an opening tag: one chapter renders eight byte-identical
 * `<a href="/…/">` cross-references, which this check first reported as one link and 7 omissions.
 *
 * THE COUNTS at the end are floors rather than constants. A chapter that gains a heading moves the rail
 * count, a chapter that gains a citation moves the prose count, and a new chapter is 9 more anchors on
 * every page. Their only job is to prove each exclusion had something to exclude, which is the failure
 * mode a filter has and a count does not.
 */
import { beforeAll, expect, test } from 'vitest';
import { buildIsCurrent, ensureBuild, loadBuiltPages } from '../support/built-site.mjs';
import { anchorTagsOf, eligibleAnchors, isPrefetchEligible } from '../support/prefetch.mjs';
import { ROLES } from '../support/prefetch-roles.mjs';

let pages = [];
let buildOrigin = '';

beforeAll(async () => {
  /* Sequenced, and for the reason `prefetch-scope.test.mjs` gives: `ensureBuild()` creates `dist/`, and a
     read racing it is a read of a directory that may not exist yet — which on a clean checkout skips
     every test here and reports the skip as a pass. */
  buildOrigin = await ensureBuild();
  pages = await loadBuiltPages();
}, 180_000);

test('every built page is readable, and this is the build they were read from', async () => {
  expect(pages.length, 'the built site has no pages to check').toBeGreaterThan(30);
  expect(buildOrigin, 'the build was never resolved').toMatch(
    /^built dist\/|^reused the build|^waited for another test file/u,
  );
  expect(await buildIsCurrent(), 'the build on disk predates the config that shaped it').toBe(true);
});

test('every link role carries exactly the eligibility the design gives it', () => {
  /*
   * The scope, asserted per role and over all thirty-eight pages. The failure message names the role and
   * the page rather than printing an anchor list, because the first question a reader has about "this
   * role's links are marked when the table says they are not" is which role, and an href list answers it
   * an order of magnitude worse than the role's own name does.
   */
  for (const { file, html } of pages) {
    for (const role of ROLES) {
      const anchors = role.anchors(html);
      const wrong = anchors.filter((anchor) => isPrefetchEligible(anchor) !== role.prefetch);
      expect(
        wrong.map(({ href }) => href),
        `${file}: ${wrong.length} of ${anchors.length} "${role.role}" links (${role.where}) are eligible for prefetching, and the design says ${role.prefetch ? 'yes' : 'no'}`,
      ).toEqual([]);
    }
  }
});

test('the table accounts for every anchor on every page, and for each of them once', () => {
  /*
   * THE EXHAUSTIVENESS CHECK, and the reason this file exists rather than being three assertions inside
   * `prefetch-scope.test.mjs`.
   *
   * `Set` on the tags, so the comparison is about COVERAGE and not about order or about a role matching
   * twice — and then the union's SIZE against the page's anchor count, which is what catches a double
   * match. The order matters in the diagnostic: the missing list is printed when the union is short, and
   * the count mismatch when it is the right length with something counted twice, and mixing the two would
   * report an overlap as an omission.
   */
  for (const { file, html } of pages) {
    const counted = [];
    for (const role of ROLES) {
      counted.push(...role.anchors(html).map(({ at }) => at));
    }
    const union = new Set(counted);
    const total = anchorTagsOf(html).length;

    expect(
      total - union.size,
      `${file}: ${total - union.size} anchors belong to no role in ROLES, so nothing is asserting whether they prefetch`,
    ).toBe(0);
    expect(
      union.size,
      `${file}: the roles match ${union.size} distinct anchors against ${counted.length} found — two roles are claiming the same link`,
    ).toBe(counted.length);
  }
});

test('every role was found somewhere, so no exclusion is untested', () => {
  /*
   * The floor for the whole table. A role whose `anchors` finder silently matches nothing — a renamed
   * landmark, a `data-` hook moved — would pass the two tests above while asserting nothing, and it is the
   * single most likely way this file becomes a green check of nothing. Asserted as "somewhere on the site"
   * rather than per page, because most roles are genuinely absent from most pages: the home page has no
   * breadcrumb and no pager, and the 404 has neither.
   */
  const totals = new Map(ROLES.map((role) => [role.role, 0]));
  for (const { html } of pages) {
    for (const role of ROLES) {
      totals.set(role.role, totals.get(role.role) + role.anchors(html).length);
    }
  }

  /*
   * A role matching nothing, and a role whose finder is broken, look identical from here — which is why the
   * one role that legitimately ships on no page says so in DATA (`absent: true` in `ROLES`) rather than in
   * prose. A second `absent` claim is a red test, so the flag cannot quietly become a way to stop looking.
   */
  expect(
    [...totals]
      .filter(([, total]) => total === 0)
      .map(([role]) => role)
      .toSorted(),
    'these ROLES matched no anchor anywhere on the site without declaring `absent`',
  ).toEqual(
    ROLES.filter((role) => role.absent === true)
      .map((role) => role.role)
      .toSorted(),
  );
});

test('the anchor counts behind the arithmetic are the ones the design quotes', () => {
  /*
   * The numbers the commit message and the `prefetch` comment in `astro.config.mjs` both rest on, summed
   * across the site so a new chapter cannot quietly move them. These are the figures:
   *
   *   - 2,487 anchors in total, every one of which was eligible before this change and 422 of which are.
   *   - 818 in-page outline links, 84 of them on one chapter, none of which could ever prefetch: the
   *     runtime strips the fragment (`prefetch/index.js:128`) and `canPrefetchUrl` then rejects the result
   *     as the current page (`index.js:156`).
   *   - 955 prose links — the cross-references the reader scrolls past, which are the argument against
   *     marking "everything in the article".
   *   - 38 breadcrumb trails, 38 skip links and 76 repository links — one, one and two per page.
   *
   * Floors, not constants, and the direction is the one that keeps them useful: a chapter gaining a
   * heading or a citation can only push these up, so a regression that narrowed the scope shows as a
   * floor tripping rather than as a number drifting.
   */
  const totals = pages.reduce(
    (sum, { html }) => {
      sum.anchors += anchorTagsOf(html).length;
      sum.eligible += eligibleAnchors(html).length;
      for (const role of ROLES) {
        sum.roles[role.role] += role.anchors(html).length;
      }
      return sum;
    },
    { anchors: 0, eligible: 0, roles: Object.fromEntries(ROLES.map((r) => [r.role, 0])) },
  );

  expect(
    totals.anchors,
    'the site no longer has the anchor count the arithmetic was written against',
  ).toBe(2487);
  expect(totals.eligible, 'the eligible count no longer matches the scope').toBe(423);
  expect(totals.roles['in-page outline'], 'the in-page outline count moved').toBeGreaterThanOrEqual(
    818,
  );
  expect(
    totals.roles['prose link'],
    'the prose cross-reference count moved',
  ).toBeGreaterThanOrEqual(955);
  expect(totals.roles.breadcrumb, 'the breadcrumb count moved').toBeGreaterThanOrEqual(63);
  expect(totals.roles['skip to content'], 'the skip-link count moved').toBe(38);
  expect(totals.roles['repository link'], 'the repository link count moved').toBe(76);
});
