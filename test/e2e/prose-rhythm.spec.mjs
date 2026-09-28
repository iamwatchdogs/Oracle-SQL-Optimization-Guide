import { expect, test } from '@playwright/test';

/**
 * The vertical rhythm of the article, and the one rule it is built on.
 *
 * `--prose-rhythm` is `calc(var(--type-body) * 1.6)` — a LENGTH, declared once on
 * `:root`. It was `1.25em`, applied per element, which is the same custom-property
 * trap as the home hero: `em` resolves against the element's OWN font-size, so the
 * paragraph gap was 22.5px on 18px text and 18px on a 14.4px code frame. The widest,
 * darkest block on the page was separated from its neighbours by less space than a
 * paragraph got, and the rhythm disagreed with itself in four places at once.
 *
 * These assertions are about the agreement, not about the number. Any one block type
 * could be given a different gap deliberately; what must not happen is the silent
 * version, where two blocks end up different because one of them has its own
 * `font-size` and nobody looked.
 */

const PROSE = '/00-preface/02-how-to-prove-a-win/';

/** The rhythm every top-level block is separated by, in one read. */
const rhythm = (page) =>
  page.evaluate(() => {
    const scope = document.querySelector('article.prose');
    const style = (element) => getComputedStyle(element);
    const px = (value) => Number.parseFloat(value);
    const first = (selector) => scope.querySelector(selector);
    const margin = (selector, edge = 'marginTop') => {
      const element = first(selector);
      return element === null ? null : px(style(element)[edge]);
    };
    const paragraphs = [...scope.querySelectorAll(':scope > p')].filter(
      (element) => !element.querySelector(':scope > strong:only-child'),
    );
    const box = (element) => element.getBoundingClientRect();

    return {
      bodySize: px(style(scope).fontSize),
      blockquoteBottom: margin('blockquote', 'marginBottom'),
      /* Measured between the boxes, not read off a stylesheet: this is the distance
         a reader actually sees, so it includes any padding or border in between. */
      paragraphGap:
        paragraphs.length < 2 ? null : box(paragraphs[1]).top - box(paragraphs[0]).bottom,
      siblings: {
        code: margin('.expressive-code'),
        list: margin('ul'),
        table: margin('.prose-table-scroll'),
      },
      h2: margin('h2'),
      h3: margin('h3'),
      h4: margin('h4'),
    };
  });

const setTextScale = (page, value) =>
  page.evaluate((scale) => {
    document.documentElement.dataset.readingText = scale;
  }, value);

const visitProse = async (page) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PROSE);
  await page.waitForTimeout(300);
};

async function paragraphBreakIsAboutOneLine({ page }) {
  const { bodySize, paragraphGap } = await rhythm(page);
  const line = bodySize * 1.65;

  /* It was 1.25 of the body — 0.76 of a line box, close enough that a run of
     paragraphs read as a wall of text rather than as separate thoughts. */
  expect(paragraphGap).toBeGreaterThan(line * 0.9);
  expect(paragraphGap).toBeLessThan(line * 1.1);
}

async function everyBlockSharesTheGap({ page }) {
  const { paragraphGap, siblings, blockquoteBottom } = await rhythm(page);

  /*
   * The point of the length, in one assertion. A list, a code frame and a table all
   * carry their own `font-size` somewhere in this project, and with an `em` rhythm
   * they each silently got a different gap — the code frame at 18px against a
   * paragraph's 22.5px, which is the wrong way round on the heaviest element on the
   * page.
   */
  for (const [name, value] of Object.entries(siblings)) {
    if (value !== null) {
      expect(value, `${name} top margin is not the rhythm`).toBeCloseTo(paragraphGap, 1);
    }
  }

  if (blockquoteBottom !== null) {
    /* It was 16px of `rem` under a 22.5px top — asymmetric, and unscaled. */
    expect(blockquoteBottom, 'the blockquote is not symmetric').toBeCloseTo(paragraphGap, 1);
  }
}

async function headingsKeepTheirOwnRhythm({ page }) {
  const { h2, h3, h4, siblings } = await rhythm(page);

  /* Headings are exempt from the sibling gap by design: more space above a heading
     than below it is what groups it with the text it introduces. */
  expect(h2).toBeGreaterThan(h3);
  expect(h3).toBeGreaterThan(h4);

  /*
   * `--spacing-prose-h4-top` was DEAD: the `>*+*` rule did not exclude `h4`, so at
   * (0,3,6) against the plugin's (0,1,0) the sibling gap won and h4 measured 21.25px
   * — the same as a plain block, so the heading token was a lie for as long as it was
   * written. It is now `1.1 × the rhythm`, which also keeps the h4 from landing
   * BELOW a paragraph break, as its own `1.5em` did.
   */
  expect(h4).toBeGreaterThan(siblings.list);
}

async function theRhythmMovesWithTheTextSize({ page }) {
  await setTextScale(page, '0.9');
  await page.waitForTimeout(150);
  const small = await rhythm(page);

  await setTextScale(page, '1.2');
  await page.waitForTimeout(150);
  const large = await rhythm(page);

  /*
   * A gap written in `rem` would sit still while the type around it grew, and the
   * page would quietly get denser as a reader made it larger — the opposite of what
   * a text-size control is for. `--prose-rhythm` is built on `--type-body`, so the
   * gap and the line stay in proportion at every step.
   */
  expect(small.paragraphGap).toBeLessThan(large.paragraphGap);
  expect(small.paragraphGap).toBeCloseTo(small.bodySize * 1.6, 0);
  expect(large.paragraphGap).toBeCloseTo(large.bodySize * 1.6, 0);
}

test.describe('the prose rhythm', () => {
  test.beforeEach(async ({ page }) => {
    await visitProse(page);
  });

  test('a paragraph break is about one line', paragraphBreakIsAboutOneLine);
  test('every top-level block is separated by the same gap', everyBlockSharesTheGap);
  test('headings keep their own rhythm, and h4 gets its own token', headingsKeepTheirOwnRhythm);
  test('the rhythm moves with the text size', theRhythmMovesWithTheTextSize);
});
