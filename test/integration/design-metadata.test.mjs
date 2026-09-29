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

test('the route swap is documented as two ladders and a pause', () => {
  /* The reverse order and the dead beat are the effect, and neither is visible in a
     settled screenshot — so the prose has to carry them. */
  expect(motionSection).toMatch(/dead beat/iu);
  expect(motionSection).toMatch(/reverse/iu);
  /* Per-zone duration, stagger, and the pause between the two windows. */
  expect(motionSection).toMatch(/240ms/iu);
  expect(motionSection).toMatch(/45ms/iu);
  expect(motionSection).toMatch(/70ms/iu);
  expect(motionSection).toMatch(/910ms/iu);
  /* The departure and the arrival as two distinct windows, because a single number for
     the whole swap is the shape that hid the arrival last time this drifted. */
  expect(motionSection).toMatch(/0.?420ms/iu);
  expect(motionSection).toMatch(/490.?910ms/iu);
  /* Both variants, and what selects between them. */
  expect(motionSection).toMatch(/`jump`/iu);
  expect(motionSection).toMatch(/`pager`/iu);
  expect(motionSection).toMatch(/data-nav/iu);
  /* The zones are named, so the count is checkable rather than rhetorical. */
  for (const zone of ['rh', 'rail', 'body', 'pager-prev', 'pager-next', 'meta']) {
    expect(motionSection, `zone ${zone} is undocumented`).toContain(zone);
  }
  /* The compositing rule, and why it is not a style preference: plus-lighter adds
     the two opacities, which is only correct while they sum to 1. In the dead beat they
     sum to ZERO, so those frames render as bare paper on this #0c0c0e ground. */
  expect(motionSection).toMatch(/plus-lighter/iu);
  expect(motionSection).toMatch(/#0c0c0e/u);
  /* Shorthand, not longhands: the UA's blend animation is a SECOND animation on the
     same pseudo-element, and a longhand cannot reach it. */
  expect(motionSection).toMatch(/shorthand/iu);
  /* Reduced motion has to be less motion, not the same motion on a longer clock. */
  expect(motionSection).toMatch(/prefers-reduced-motion/iu);
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
  expect(first).toMatch(/240ms/iu);
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
  /* The stagger, per zone, with the departure and the reversed arrival both spelled out
     in the order they run. A single number for the whole page is the shape the old
     design had, and it is exactly the shape that hid the reverse-order arrival. */
  expect(jump.value).toMatch(/240ms/u);
  expect(jump.value).toMatch(/0\/45\/90\/135\/180ms/u);
  expect(jump.value).toMatch(/490\/535\/580\/625\/670ms/u);
  expect(jump.value).toMatch(/70ms dead beat/iu);
  expect(jump.value).toMatch(/z-index 2/u);
  expect(jump.value).toMatch(/groups animation none/u);
  /* The pager differs in exactly one thing: the centre rises instead of holding still. */
  expect(pager.value).toMatch(/zone-in-up/iu);
  expect(pager.value).toMatch(/translateY\(-36px\)/u);
  /* And it is the same ladder and the same pause, or it is a second design. */
  expect(pager.value).toMatch(/490\/535\/580\/625\/670ms/u);
  for (const route of [jump, pager]) {
    expect(route.purpose).toMatch(/opacity #1/iu);
  }
  /* The compositing rationale lives once, on the jump entry: one mechanism shared by
     both variants, and the swap's first entry is where a reader will look for it. */
  expect(jump.purpose).toMatch(/sum to ZERO/iu);
  expect(jump.purpose).toMatch(/plus-lighter/iu);
  expect(jump.purpose).toMatch(/animation shorthand, not longhands/iu);
  /* The two traps that cost the most time, recorded where a reader will find them. */
  expect(jump.purpose).toMatch(/reapplies the incoming document's <html> attributes/u);
  expect(jump.purpose).toMatch(/BARE/u);
  expect(jump.purpose).toMatch(/910ms/u);
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
