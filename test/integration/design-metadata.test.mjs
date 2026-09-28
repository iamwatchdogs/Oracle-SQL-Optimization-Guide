import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { LOADER_DELAY, LOADER_MAX_VISIBLE_MS } from '../../src/lib/route-loader-timer.mjs';

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
/* The loader's own markup lives in `RouteSkeleton.astro`; the layout renders the
   component. Both are read wherever the test is about what ships, because the
   component is what ships the loader. */
const routeSkeleton = await readRepoFile('src/components/RouteSkeleton.astro');
const loaderSurface = `${baseLayout}\n${routeSkeleton}`;

/*
 * Template source with its comments stripped.
 *
 * The comment explaining the header's ABSENCE of a transition animation would
 * otherwise satisfy the very pattern that is meant to prove it.
 */
const markup = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

const routeLoaderMarkup = () => {
  const start = routeSkeleton.indexOf('data-route-loader');

  expect(start).toBeGreaterThan(-1);
  return routeSkeleton.slice(start, routeSkeleton.indexOf('</div>', start));
};

test('motion names exactly two sanctioned opacity transitions, and only one is 180ms', () => {
  /*
   * This asserted "both 180ms" for as long as both were. They are not any more: the
   * route fade is now 400ms of out-then-in, because a symmetric 180ms cross-dissolve
   * never gave the reader a moment when either page was settled. The loader reveal
   * is still 180ms and still is a plain in-out toggle.
   *
   * The count is the part that must not drift. Everything else here is the sequence.
   */
  expect(motionSection).toMatch(/exactly two sanctioned opacity transitions/iu);
  expect(motionSection).toMatch(/only the second is 180ms/iu);
  expect(motionSection).toMatch(/whole-page route fade/iu);
  expect(motionSection).toMatch(/loader state reveal/iu);
  expect(motionSection).toMatch(/no prose, disclosure, or reading element may fade in/iu);
  expect(motionSection).toMatch(/navigation or state feedback/iu);
  expect(motionSection).not.toMatch(/one opacity exception|single opacity exception/iu);
});

test('the route fade is documented as a sequence with an overlap, not a cross-fade', () => {
  expect(motionSection).toMatch(/fade OUT, then fade IN/iu);
  /* out, in, delay, geometry, overlap. Each one is a number a reader of this file
     would otherwise have to take on trust. */
  expect(motionSection).toMatch(/out 180ms/iu);
  expect(motionSection).toMatch(/in 260ms/iu);
  expect(motionSection).toMatch(/140ms\*\* delay/iu);
  expect(motionSection).toMatch(/260ms\*\*/u);
  expect(motionSection).toMatch(/40ms overlap/iu);
  /* The longhand rule, and why it is not a style preference. */
  expect(motionSection).toMatch(/mix-blend-mode/iu);
  /* Reduced motion has to be less motion, not the same motion on a longer clock. */
  expect(motionSection).toMatch(/prefers-reduced-motion/iu);
});

test('the shipped route loader reveals at 180ms, not 150ms', () => {
  const loader = routeLoaderMarkup();

  expect(loader).toContain('transition-opacity duration-[180ms]');
  expect(loader).not.toMatch(/transition-opacity duration-150\b/u);
  expect(loader).toMatch(/opacity-0[\s\S]{0,400}?data-\[visible=true\]:opacity-100/u);
});

test('the shipped reveal duration matches the shipped loader delay', () => {
  /*
   * The constants are IMPORTED, not parsed out of the source text.
   *
   * The previous version ran `/export const LOADER_DELAY = (\d+);/` against the
   * file. That couples the test to the literal spelling of an export: rename the
   * constant, or reformat the declaration, and the regex quietly stops matching
   * and `Number(undefined)` becomes `NaN` — at which point the assertion either
   * fails for a formatting reason or, worse, is loosened to accommodate it. The
   * values are the contract; importing them tests the contract.
   *
   * Only the CSS duration still has to be read from the markup, because it lives
   * in a Tailwind arbitrary value rather than in JavaScript.
   */
  const duration = Number(
    /transition-opacity duration-\[(\d+)ms\]/u.exec(routeLoaderMarkup())?.[1],
  );

  expect(LOADER_DELAY).toBe(180);
  expect(duration).toBe(180);
  expect(duration).toBe(LOADER_DELAY);
  // The cap must outlast the reveal by a wide margin or it would hide the
  // skeleton before it ever appeared.
  expect(LOADER_MAX_VISIBLE_MS).toBeGreaterThan(LOADER_DELAY * 10);
});

test('the loader is the only shipped opacity transition in the layout', () => {
  const others = loaderSurface.replace(routeLoaderMarkup(), '');

  expect(others).not.toMatch(/transition-opacity/u);
  expect(loaderSurface.match(/transition-opacity/gu)).toHaveLength(1);
});

test('both sanctioned opacity transitions ship at the same 180ms duration', async () => {
  const layoutDuration = Number(
    /transition-opacity duration-\[(\d+)ms\]/u.exec(routeLoaderMarkup())?.[1],
  );
  /*
   * The cross-fade is read from the ROUTE TEMPLATES, not the layout.
   *
   * DESIGN.md sanctions exactly two opacity transitions, and the cross-fade is
   * the whole-document one the `<ClientRouter>` swap performs on the swapped
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

  expect(layoutDuration).toBe(180);
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

test('both sanctioned opacity bullets stay in Motion', () => {
  const first = bulletWith(motionLines, 'sanctioned opacity #1');
  const second = bulletWith(motionLines, 'sanctioned opacity #2');

  expect(first).toBeDefined();
  expect(first).toMatch(/no element on a page may fade in from `opacity: 0`/iu);
  expect(first).toMatch(/400ms/iu);
  expect(second).toBeDefined();
  expect(second).toMatch(/state feedback/iu);
  expect(second).toMatch(/duration-\[180ms\]/u);
});

test("the Don't list keeps both sanctioned opacity transitions consistent", () => {
  const opacityDont = bulletWith(dontList, 'opacity');

  expect(opacityDont).toBeDefined();
  expect(opacityDont).toMatch(/ClientRouter/u);
  expect(opacityDont).toMatch(/loader state reveal/u);
  /* The two are no longer the same length, so the Don't cannot claim they are. */
  expect(opacityDont).not.toMatch(/both 180ms/iu);
  expect(opacityDont).toMatch(/never content entrance/iu);
});

test('design metadata motion mirrors the documented motion values', () => {
  const motion = designMetadata.extensions.motion;
  const rise = motion.find((entry) => entry.name === 'rise-in');
  const route = motion.find((entry) => entry.name === 'route-fade');
  const disclosure = motion.find((entry) => entry.name === 'disclosure');
  const loader = motion.find((entry) => entry.name === 'loader-reveal');
  const rail = motion.find((entry) => entry.name === 'rail-collapse');

  expect(rise.value).toMatch(/500ms/u);
  expect(rise.value).toMatch(/translateY\(10px\)/u);
  expect(rise.purpose).toMatch(/transform-only/u);
  expect(route.value).toMatch(/out 180ms/u);
  expect(route.value).toMatch(/in 260ms/u);
  expect(route.value).toMatch(/140ms delay/u);
  /* The geometry curve is written without spaces after the commas here, unlike
     everywhere else in this project — matching how the other `design.json` values
     are spelled, so a reader comparing the two does not think it is a different
     curve. */
  expect(route.value).toMatch(/view-transition groups 260ms cubic-bezier\(0\.22,1,0\.36,1\)/u);
  expect(route.purpose).toMatch(/opacity #1/iu);
  expect(route.purpose).toMatch(/out then in/iu);
  expect(route.purpose).toMatch(/40ms overlap/iu);
  expect(route.purpose).toMatch(/longhands/iu);
  expect(disclosure.value).toMatch(/280ms/u);
  expect(loader.value).toMatch(/180ms/u);
  expect(loader.purpose).toMatch(/opacity #2/iu);
  expect(loader.purpose).toMatch(/never content entrance/iu);
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

  expect(opacityEntries).toHaveLength(2);
  expect(opacityEntries.map((entry) => entry.name).toSorted()).toEqual([
    'loader-reveal',
    'route-fade',
  ]);
});

test('design metadata donts mirror the documented opacity contract', () => {
  const opacityDont = designMetadata.narrative.donts.find((line) => line.includes('opacity'));

  expect(opacityDont).toMatch(/ClientRouter/u);
  expect(opacityDont).toMatch(/loader state reveal/u);
  expect(opacityDont).toMatch(/both 180ms/u);
  expect(opacityDont).toMatch(/never content entrance/u);
});

test('the flat elevation contract and shadow vocabulary stay intact', () => {
  const elevation = section(designMarkdown, 'Elevation & Depth');
  const vocabulary = subSection(designMarkdown, 'Shadow Vocabulary');

  expect(elevation).toMatch(/no authored box-shadows exist in any theme/iu);
  expect(vocabulary).toMatch(/Expressive Code frames are flat/iu);
  expect(vocabulary).not.toMatch(/rise-in|translateY/u);
  expect(designMetadata.extensions.shadows).toEqual([]);
});
