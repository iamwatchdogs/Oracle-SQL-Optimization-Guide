import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const readDesignMarkdown = () => readRepoFile('DESIGN.md');
const readDesignMetadata = async () => JSON.parse(await readRepoFile('.impeccable/design.json'));

const section = (markdown, heading) => {
  const start = markdown.indexOf(`\n## ${heading}\n`);

  if (start === -1) {
    throw new Error(`missing section: ${heading}`);
  }
  const rest = markdown.slice(start + 1);
  const end = rest.indexOf('\n## ');

  return end === -1 ? rest : rest.slice(0, end);
};

const listItems = (markdown, heading) =>
  section(markdown, heading)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));

const bulletWith = (lines, needle) => lines.find((line) => line.includes(needle));

const subSection = (markdown, heading) => {
  const start = markdown.indexOf(`### ${heading}`);
  const rest = markdown.slice(start + heading.length + 4);
  const end = rest.search(/^#{2,3} /mu);

  return end === -1 ? rest : rest.slice(0, end);
};

const designMarkdown = await readDesignMarkdown();
const designMetadata = await readDesignMetadata();
const motionSection = section(designMarkdown, 'Motion');
const motionLines = motionSection.split('\n').map((line) => line.trim());
const dontList = listItems(designMarkdown, "Do's and Don'ts").filter((line) =>
  line.startsWith("- **Don't**"),
);
const baseLayout = await readRepoFile('src/layouts/BaseLayout.astro');

/*
 * Template source with its comments stripped.
 *
 * The comment explaining the header's ABSENCE of a transition animation would
 * otherwise satisfy the very pattern that is meant to prove it.
 */
const markup = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

test('motion names exactly one sanctioned opacity transition, the route swap', () => {
  /*
   * This said "two" while there were two. The route loader's reveal was the second
   * and it is gone, along with the loader, so the route swap is now the only opacity
   * transition this design system sanctions anywhere.
   *
   * The count is the part that must not drift. A second sanctioned opacity is a
   * permission slip, and the check that would have caught it is this one.
   */
  expect(motionSection).toMatch(/exactly one sanctioned opacity transition/iu);
  expect(motionSection).toMatch(/route swap's zone choreography/iu);
  expect(motionSection).not.toMatch(/loader state reveal/iu);
  expect(motionSection).toMatch(/no prose, disclosure, or reading element may fade in/iu);
  expect(motionSection).toMatch(/navigation/iu);
  expect(motionSection).not.toMatch(/one opacity exception|single opacity exception/iu);
});

test('the route swap is documented as uncovering the new page, not cross-fading', () => {
  expect(motionSection).toMatch(/uncovered, not faded through the paper/iu);
  /* The exit and entrance windows matter as much as the per-zone duration: the
     reverse order and the dead beat are the effect, and both are invisible in a
     settled screenshot. */
  expect(motionSection).toMatch(/190ms/iu);
  expect(motionSection).toMatch(/45ms/iu);
  expect(motionSection).toMatch(/70ms/iu);
  expect(motionSection).toMatch(/810ms/iu);
  /* Both variants, and what selects between them. */
  expect(motionSection).toMatch(/`jump`/iu);
  expect(motionSection).toMatch(/`pager`/iu);
  expect(motionSection).toMatch(/data-nav/iu);
  /* The zones are named, so the count is checkable rather than rhetorical. */
  for (const zone of ['rh', 'rail', 'body', 'pager-prev', 'pager-next', 'meta']) {
    expect(motionSection, `zone ${zone} is undocumented`).toContain(zone);
  }
  /* The compositing rule, and why it is not a style preference: plus-lighter adds
     the two opacities, which is only correct while they sum to 1, and a sequence
     cannot hold that. On this paper the broken frames render darker. */
  expect(motionSection).toMatch(/plus-lighter/iu);
  expect(motionSection).toMatch(/#0c0c0e/u);
  /* Shorthand, not longhands: the UA's blend animation is a SECOND animation on the
     same pseudo-element, and a longhand cannot reach it. */
  expect(motionSection).toMatch(/shorthand/iu);
  /* Reduced motion has to be less motion, not the same motion on a longer clock. */
  expect(motionSection).toMatch(/prefers-reduced-motion/iu);
});

test('the route swap names its zones, and names them explicitly', async () => {
  /*
   * Every zone is an explicit `transition:name`, never a `transition:animate`.
   *
   * This used to assert three `fade({ duration: '0.18s' })` calls — one per
   * `<main>` across the two route templates. There is no `fade()` left: the swap is
   * a per-zone stagger now, and `fade()` writes `plus-lighter` into its own
   * keyframes, which a staggered sequence cannot composite. Every zone is named
   * instead, so the choreography in `global.css` can reach it by name.
   *
   * The count is the part that must not drift. A `<main>` that quietly loses its
   * name becomes an unnamed region inside the root snapshot and stops taking part in
   * the stagger, which is invisible in review and obvious on screen.
   */
  const templates = await Promise.all(
    [
      'src/pages/[...slug].astro',
      'src/pages/404.astro',
      'src/components/HomeTitleBlock.astro',
      'src/components/PrevNext.astro',
    ].map((path) => readRepoFile(path)),
  );
  const declared = templates
    .flatMap((source) => [...source.matchAll(/transition:name="([\w-]+)"/gu)])
    .map(([, name]) => name);

  /* Three `<main>`s across the route templates — two mutually exclusive branches of
   * the catch-all plus the 404's own — and the rest are content zones. */
  /* `body` on the two section templates, `body-home` on the home page: the home column
     is 1152px at x=64 and a section's is 824px at x=392, so one shared name asks the
     browser to morph one into the other and it slides the page 328px to do it. */
  expect(declared.filter((name) => name === 'body')).toHaveLength(2);
  expect(declared.filter((name) => name === 'body-home')).toHaveLength(1);
  for (const zone of ['rh', 'rail', 'meta', 'pager-prev', 'pager-next']) {
    expect(declared, `zone ${zone} is not named in any template`).toContain(zone);
  }

  /* No `fade()` and no `transition:animate` anywhere in the routes: a re-introduced
   * animation would write `plus-lighter` back over the zone choreography. */
  for (const source of templates) {
    expect(source).not.toMatch(/transition:animate/u);
    expect(source).not.toMatch(/from 'astro:transitions'/u);
  }
  /* The layout declares none either — it owns the router, not the zones. */
  expect(markup(baseLayout)).not.toMatch(/transition:(animate|name|persist)/u);
});

test('in-page entrance motion stays transform-only', () => {
  const entrance = bulletWith(motionLines, 'Title-block entrance');

  expect(entrance).toBeDefined();
  expect(entrance).toMatch(/transform-only/iu);
  expect(entrance).not.toMatch(/opacity/iu);
  expect(entrance).toMatch(/500ms/u);
});

test('the one sanctioned opacity bullet stays in Motion', () => {
  const first = bulletWith(motionLines, 'sanctioned opacity #1');

  expect(first).toBeDefined();
  expect(first).toMatch(/no element on a page may fade in from `opacity: 0`/iu);
  /* The per-zone duration, not a whole-swap total: the zones are what animate, and a
     single number for the whole page is the shape the old design had. */
  expect(first).toMatch(/190ms/iu);
  expect(first).toMatch(/45ms/iu);
  /* The loader used to be bullet #2. If a second sanctioned opacity reappears in
     the metadata, this catches the number drifting before the prose does. */
  expect(bulletWith(motionLines, 'sanctioned opacity #2')).toBeUndefined();
});

test("the Don't list keeps the sanctioned opacity transition consistent", () => {
  const opacityDont = bulletWith(dontList, 'opacity');

  expect(opacityDont).toBeDefined();
  expect(opacityDont).toMatch(/ClientRouter/u);
  expect(opacityDont).not.toMatch(/loader state reveal/iu);
  expect(opacityDont).not.toMatch(/both 180ms/iu);
  expect(opacityDont).toMatch(/never content entrance/iu);
});

test('design metadata motion mirrors the documented motion values', () => {
  const motion = designMetadata.extensions.motion;
  const rise = motion.find((entry) => entry.name === 'rise-in');
  const jump = motion.find((entry) => entry.name === 'route-zones-jump');
  const pager = motion.find((entry) => entry.name === 'route-zones-pager');
  const disclosure = motion.find((entry) => entry.name === 'disclosure');
  const rail = motion.find((entry) => entry.name === 'rail-collapse');

  expect(rise.value).toMatch(/500ms/u);
  expect(rise.value).toMatch(/translateY\(10px\)/u);
  expect(rise.purpose).toMatch(/transform-only/u);
  /* The stagger, per zone, with the exit and the reversed entrance both spelled out
     in the order they run. A single number for the whole page is the shape the old
     design had, and it is exactly the shape that hid the reverse-order arrival. */
  expect(jump.value).toMatch(/190ms/u);
  expect(jump.value).toMatch(/0\/45\/90\/135\/180ms/u);
  expect(jump.value).toMatch(/530\/575\/440\/485\/620ms/u);
  expect(jump.value).toMatch(/z-index 2/u);
  expect(jump.value).toMatch(/groups animation none/u);
  /* The pager's point is the title arriving first and the column following it down. */
  expect(pager.value).toMatch(/title 440ms and body 485ms/u);
  expect(pager.value).toMatch(/translateY\(-36px\)/u);
  for (const route of [jump, pager]) {
    expect(route.purpose).toMatch(/opacity #1/iu);
  }
  /* The compositing rationale lives once, on the jump entry: one mechanism shared by
     both variants, and the swap's first entry is where a reader will look for it. */
  expect(jump.purpose).toMatch(/opaque snapshot UNDERNEATH/iu);
  expect(jump.purpose).toMatch(/plus-lighter/iu);
  expect(jump.purpose).toMatch(/animation shorthand, not longhands/iu);
  /* The two traps that cost the most time, recorded where a reader will find them. */
  expect(jump.purpose).toMatch(/reapplies the incoming document's <html> attributes/u);
  expect(jump.purpose).toMatch(/BARE/u);
  expect(jump.purpose).toMatch(/810ms/u);
  expect(pager.value).toMatch(/data-nav='pager'/u);
  expect(disclosure.value).toMatch(/280ms/u);
  /* The rail's control is one control that moves, and the metadata has to say so —
     an "edge tab" in the motion table is a description of a control that no longer
     exists. */
  expect(rail.value).toMatch(/rotate 180deg/u);
  expect(rail.purpose).toMatch(/One control, not two/u);
});

test('the metadata has exactly one sanctioned opacity mechanism, and it is the swap', () => {
  /*
   * This said "two" and asserted one. The route loader's reveal was the second, and it
   * went with the loader — but the swap then split into two variants, so a count of
   * one is no longer the shape to check. What has to hold is that the opacity-bearing
   * entries are exactly the two halves of one mechanism, and nothing else claims
   * opacity.
   */
  const opacityEntries = designMetadata.extensions.motion.filter((entry) =>
    /opacity #1/u.test(entry.purpose),
  );

  expect(opacityEntries.map((entry) => entry.name)).toEqual([
    'route-zones-jump',
    'route-zones-pager',
  ]);
});

test('design metadata donts mirror the documented opacity contract', () => {
  const opacityDont = designMetadata.narrative.donts.find((line) => line.includes('opacity'));

  expect(opacityDont).toMatch(/ClientRouter/u);
  expect(opacityDont).not.toMatch(/loader state reveal/iu);
  expect(opacityDont).not.toMatch(/both 180ms/iu);
  expect(opacityDont).toMatch(/never content entrance/iu);
});

test('the flat elevation contract and shadow vocabulary stay intact', () => {
  const elevation = section(designMarkdown, 'Elevation & Depth');
  const vocabulary = subSection(designMarkdown, 'Shadow Vocabulary');

  expect(elevation).toMatch(/no authored box-shadows exist in any theme/iu);
  expect(vocabulary).toMatch(/Expressive Code frames are flat/iu);
  expect(vocabulary).not.toMatch(/rise-in|translateY/u);
  expect(designMetadata.extensions.shadows).toEqual([]);
});
