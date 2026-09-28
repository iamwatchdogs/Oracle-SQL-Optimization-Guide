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

test('motion names exactly one sanctioned opacity transition, the route fade', () => {
  /*
   * This said "two" while there were two. The route loader's reveal was the second
   * and it is gone, along with the loader, so the whole-page route fade is now the
   * only opacity transition this design system sanctions anywhere.
   *
   * The count is the part that must not drift. A second sanctioned opacity is a
   * permission slip, and the check that would have caught it is this one.
   */
  expect(motionSection).toMatch(/exactly one sanctioned opacity transition/iu);
  expect(motionSection).toMatch(/whole-page route fade/iu);
  expect(motionSection).not.toMatch(/loader state reveal/iu);
  expect(motionSection).toMatch(/no prose, disclosure, or reading element may fade in/iu);
  expect(motionSection).toMatch(/navigation/iu);
  expect(motionSection).not.toMatch(/one opacity exception|single opacity exception/iu);
});

test('the route fade is documented as uncovering the new page, not cross-fading', () => {
  expect(motionSection).toMatch(/uncovered, not faded through the paper/iu);
  /* out, delay, geometry, and the one value that carries the whole mechanism. Each
     is a number a reader of this file would otherwise have to take on trust. */
  expect(motionSection).toMatch(/out 230ms/iu);
  expect(motionSection).toMatch(/\*\*50ms\*\* beat/iu);
  expect(motionSection).toMatch(/230ms\*\*/u);
  expect(motionSection).toMatch(/\*\*280ms\*\*/iu);
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

test('the route fade ships at 180ms on every template that declares one', async () => {
  /*
   * The cross-fade is read from the ROUTE TEMPLATES, not the layout.
   *
   * DESIGN.md sanctions exactly one opacity transition, and it is the
   * whole-document one the `<ClientRouter>` swap performs on the swapped
   * content. It used to be declared on four sibling elements — two `<main>`
   * branches and the `<header>` — which meant the persistent header chrome
   * dissolved and re-materialised on every navigation (content entrance on
   * furniture, and the exact thing the design world's rationale excludes) and
   * four elements cross-faded independently instead of one page. The header
   * declaration is now gone, and this test pins that: the count is asserted
   * against BOTH templates, so a fourth one coming back fails here rather than
   * shipping.
   */
  const templates = await Promise.all(
    ['src/pages/[...slug].astro', 'src/pages/404.astro'].map((path) => readRepoFile(path)),
  );
  const routeFades = templates
    .flatMap((source) => [...source.matchAll(/fade\(\{ duration: '([\d.]+)s' \}\)/gu)])
    .map(([, seconds]) => Math.round(Number(seconds) * 1000));

  expect(routeFades).toHaveLength(3);
  for (const duration of routeFades) {
    expect(duration).toBe(180);
  }
  /* Exactly one cross-fade per page: the two mutually exclusive `<main>`
   * branches of the catch-all plus the 404 page's own `<main>`. */
  expect(markup(baseLayout)).not.toMatch(/transition:animate/u);
  /* The catch-all carries two — its `<main>` is written twice for the home and
   * interior branches, which are mutually exclusive — and 404 carries one. */
  expect(markup(templates[0]).match(/transition:animate/gu)).toHaveLength(2);
  expect(markup(templates[1]).match(/transition:animate/gu)).toHaveLength(1);
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
  expect(first).toMatch(/280ms/iu);
  /* The loader used to be bullet #2. If a second sanctioned opacity reappears in
     the metadata, this catches the number drifting before the prose does. */
  expect(bulletWith(motionLines, 'sanctioned opacity #2')).toBeUndefined();
});

test("the Don't list keeps both sanctioned opacity transitions consistent", () => {
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
  const route = motion.find((entry) => entry.name === 'route-fade');
  const disclosure = motion.find((entry) => entry.name === 'disclosure');
  const rail = motion.find((entry) => entry.name === 'rail-collapse');

  expect(rise.value).toMatch(/500ms/u);
  expect(rise.value).toMatch(/translateY\(10px\)/u);
  expect(rise.purpose).toMatch(/transform-only/u);
  expect(route.value).toMatch(/opacity 1 → 0, 230ms/u);
  expect(route.value).toMatch(/50ms beat/u);
  expect(route.value).toMatch(/z-index 2/u);
  /* The geometry curve is written without spaces after the commas here, unlike
     everywhere else in this project — matching how the other `design.json` values
     are spelled, so a reader comparing the two does not think it is a different
     curve. */
  expect(route.value).toMatch(/view-transition groups 230ms cubic-bezier\(0\.22,1,0\.36,1\)/u);
  expect(route.purpose).toMatch(/opacity #1/iu);
  /* The metadata has to name the mechanism, or it reads as a generic page fade and
     the next person to touch this reaches for the cross-fade that caused the dip. */
  expect(route.purpose).toMatch(/opaque snapshot UNDERNEATH/iu);
  expect(route.purpose).toMatch(/plus-lighter/iu);
  expect(route.purpose).toMatch(/animation shorthand, not longhands/iu);
  expect(route.value).toMatch(/new: animation none/u);
  expect(disclosure.value).toMatch(/280ms/u);
  /* The rail's control is one control that moves, and the metadata has to say so —
     an "edge tab" in the motion table is a description of a control that no longer
     exists. */
  expect(rail.value).toMatch(/rotate 180deg/u);
  expect(rail.purpose).toMatch(/One control, not two/u);
});

test('exactly two metadata motion entries are opacity-bearing', () => {
  const opacityEntries = designMetadata.extensions.motion.filter((entry) =>
    /opacity/iu.test(entry.purpose),
  );

  expect(opacityEntries).toHaveLength(1);
  expect(opacityEntries.map((entry) => entry.name)).toEqual(['route-fade']);
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
