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

const routeLoaderMarkup = () => {
  const start = baseLayout.indexOf('data-route-loader');

  expect(start).toBeGreaterThan(-1);
  return baseLayout.slice(start, baseLayout.indexOf('</div>', start));
};

test('motion names exactly two sanctioned opacity transitions, both 180ms', () => {
  expect(motionSection).toMatch(/exactly two sanctioned opacity transitions, both 180ms/iu);
  expect(motionSection).toMatch(/whole-page cross-?fade/iu);
  expect(motionSection).toMatch(/loader state reveal/iu);
  expect(motionSection).toMatch(/no prose, disclosure, or reading element may fade in/iu);
  expect(motionSection).toMatch(/navigation or state feedback/iu);
  expect(motionSection).not.toMatch(/one opacity exception|single opacity exception/iu);
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

test('the loader is the only shipped opacity transition', () => {
  const others = baseLayout.replace(routeLoaderMarkup(), '');

  expect(others).not.toMatch(/transition-opacity/u);
  expect(baseLayout.match(/transition-opacity/gu)).toHaveLength(1);
});

test('both sanctioned opacity transitions ship at the same 180ms duration', () => {
  const layoutDuration = Number(
    /transition-opacity duration-\[(\d+)ms\]/u.exec(routeLoaderMarkup())?.[1],
  );
  const routeFades = [...baseLayout.matchAll(/fade\(\{ duration: '([\d.]+)s' \}\)/gu)].map(
    ([, seconds]) => Math.round(Number(seconds) * 1000),
  );

  expect(layoutDuration).toBe(180);
  expect(routeFades.length).toBeGreaterThan(0);
  for (const duration of routeFades) {
    expect(duration).toBe(180);
  }
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
  expect(first).toMatch(/180ms/u);
  expect(second).toBeDefined();
  expect(second).toMatch(/state feedback/iu);
  expect(second).toMatch(/duration-\[180ms\]/u);
});

test("the Don't list keeps both sanctioned opacity transitions consistent", () => {
  const opacityDont = bulletWith(dontList, 'opacity');

  expect(opacityDont).toBeDefined();
  expect(opacityDont).toMatch(/ClientRouter/u);
  expect(opacityDont).toMatch(/loader state reveal/u);
  expect(opacityDont).toMatch(/both 180ms/iu);
  expect(opacityDont).toMatch(/never content entrance/iu);
});

test('design metadata motion mirrors the documented motion values', () => {
  const motion = designMetadata.extensions.motion;
  const rise = motion.find((entry) => entry.name === 'rise-in');
  const route = motion.find((entry) => entry.name === 'route-fade');
  const disclosure = motion.find((entry) => entry.name === 'disclosure');
  const loader = motion.find((entry) => entry.name === 'loader-reveal');

  expect(rise.value).toMatch(/500ms/u);
  expect(rise.value).toMatch(/translateY\(10px\)/u);
  expect(rise.purpose).toMatch(/transform-only/u);
  expect(route.value).toMatch(/180ms/u);
  expect(route.purpose).toMatch(/ClientRouter/u);
  expect(route.purpose).toMatch(/opacity #1/iu);
  expect(disclosure.value).toMatch(/280ms/u);
  expect(loader.value).toMatch(/180ms/u);
  expect(loader.purpose).toMatch(/opacity #2/iu);
  expect(loader.purpose).toMatch(/never content entrance/iu);
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
