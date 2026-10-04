/*
 * The code-block stylesheet, as a browser experiences it.
 *
 * `code-block-css.test.mjs` proves expressive-code's rules are inlined and that nothing links a stylesheet
 * after `</head>`. That is the right level for a fact about a file on disk, and it cannot say what
 * actually matters: whether a reader sees a code block painted correctly, or a wall of unstyled grey text
 * while a stylesheet is still in flight. This is the level that can.
 *
 * The method is the one `critical-css.spec.mjs` established for the global sheet, and it is deliberately
 * not a timing measurement. Nothing here waits for network idle, asserts a byte count, or races a paint
 * against a deadline — a spec that does any of those reports on the machine it ran on rather than on
 * the site, which is a test that fails in CI and passes on a laptop.
 *
 * Instead: ABORT every stylesheet request, then assert the code block is completely styled. If
 * expressive-code's sheet were still an external `<link>` — as it was on thirty-four of thirty-eight
 * pages, written into `<body>` at the position of the first code block — refusing all CSS leaves a
 * genuinely unstyled `<pre>`: no background, no monospace face, no syntax colours.
 *
 * That is a stronger claim than "it got fast", and it cannot flake. An inline `<style>` is applied while
 * the document is parsed, so there is no window in which the block is briefly unstyled and therefore no
 * deadline to race. `DOMContentLoaded` is the moment asserted against, for the reason
 * `critical-css.spec.mjs` chose it: DCL fires after the document has been parsed, so every inline
 * `<style>` has already been applied. Waiting for `load` would additionally wait on webfonts and on
 * expressive-code's `ec.*.js` copy-button module, neither of which this assertion is about.
 *
 * No assertion here names a colour literal: `--ec-codeBg` is read out of the page and the `pre`'s
 * background compared against it, so a theme bump moves both sides and this stays green while a sheet
 * that stops arriving drops one side and goes red. That is the property a byte count does not have.
 */
import { expect, test } from '@playwright/test';
import { FIRST_PAGE } from './support/pages.mjs';

/** A cold load of a chapter with two code blocks — more than one, so duplication shows. */
const CODE_PAGE = FIRST_PAGE;

/** The door: no code block, so nothing here should be fetching or carrying CSS. */
const CODE_FREE_PAGE = '/';

/** `#0c0c0e` as a browser reports it. Compared against the page, never asserted as a literal. */
const toRgb = (hex) =>
  `rgb(${hex
    .slice(1)
    .match(/.{2}/gu)
    .map((pair) => Number.parseInt(pair, 16))
    .join(', ')})`;

/**
 * Refuse every stylesheet request the page makes, and record every one it attempted.
 *
 * The glob matches on the URL, so it covers the hashed `_astro` assets whatever the
 * deployment prefix is — no `deployed()` needed here, and no way for a prefix change to
 * quietly turn this into a spec that blocks nothing and passes vacuously.
 *
 * The recorded list is the anti-vacuity guard, and it is a DIFFERENT guard from the one
 * `critical-css.spec.mjs` uses, because the correct answer here is the opposite. That spec asserts
 * `refused.length > 0` because it is proving the global sheet no longer arrives over the wire. Here
 * there is nothing to refuse: after inlining, this site fetches no stylesheet at all, so asserting a
 * refusal would assert the regression. The assertion is that the list is EMPTY, which still fails if the
 * route handler was never installed AND an external sheet exists — the combination this spec exists to
 * catch — and cannot pass vacuously when the sheet is inline, because the computed-style assertions
 * carry that case.
 */
const refuseStylesheets = async (page) => {
  const requested = [];
  await page.route('**/*.css', (route) => {
    requested.push(new URL(route.request().url()).pathname);
    return route.abort();
  });
  return requested;
};

/**
 * What expressive-code's stylesheet alone has to be able to produce.
 *
 * Five facts, checked at five different levels, so a partial failure names which rule went missing:
 *
 *   - `--ec-codeBg` resolving to a hex value proves the THEME stylesheet arrived. The name is
 *     expressive-code's own; nothing else in this project declares an `--ec-` one. The `:root` chain
 *     matters: these properties are set on `.expressive-code[data-theme='github-dark']`, so resolving at
 *     all means the theme selector matched.
 *   - `background-color` on the `pre` equalling that value proves the BASE stylesheet's
 *     `.expressive-code pre{background:var(--ec-codeBg)}` arrived AND applied — the paint, not the
 *     declaration.
 *   - `border-radius` on the `pre` proving `calc(var(--ec-brdRad) + var(--ec-brdWd))` resolved. This is
 *     what a `<style>` written but not applied cannot pass: a `calc()` over two custom properties only
 *     computes when both the base and theme halves are present.
 *   - `font-family` on the `code` proving `--ec-codeFontFml` resolved to a monospace stack.
 *     `ui-monospace` is the marker because it is the entry expressive-code declares.
 *   - `color` on a token span equalling its own `--0` custom property. The sharpest of the five:
 *     expressive-code emits each token as `<span style="--0:#F97583">` and styles it with
 *     `.expressive-code .ec-line :where(span[style^='--']:not([class])){color:var(--0, inherit)}`.
 *     Without that rule a syntax-coloured block and a monochrome one are indistinguishable.
 *
 * Every one is a computed value rather than a rendered metric, so none of this waits on a webfont or on
 * expressive-code's `ec.*.js`: a `font-display: swap` face that has not loaded still computes to the
 * declared family list. That is what keeps the spec deterministic across the four browser projects.
 */
const readCodeBlockFacts = (page) =>
  page.evaluate(() => {
    const styleOf = (element) => (element === null ? null : getComputedStyle(element));
    const block = document.querySelector('.expressive-code');
    const root = styleOf(block);
    const preStyle = styleOf(block?.querySelector('pre') ?? null);
    const codeStyle = styleOf(block?.querySelector('pre > code') ?? null);
    const tokenStyle = styleOf(block?.querySelector('.ec-line .code span[style^="--"]') ?? null);

    return {
      blockCount: document.querySelectorAll('.expressive-code').length,
      styleCount: document.querySelectorAll('.expressive-code > style').length,
      /* Every stylesheet the document references, in DOM terms — what a request log would show. */
      externalSheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        (link) => link.getAttribute('href') ?? '',
      ),
      headSheets: [...document.head.querySelectorAll('link[rel="stylesheet"]')].length,
      codeBg: root === null ? null : root.getPropertyValue('--ec-codeBg').trim(),
      preBackground: preStyle?.backgroundColor ?? null,
      preRadius: preStyle?.borderTopLeftRadius ?? null,
      codeFamily: codeStyle?.fontFamily ?? null,
      tokenColor: tokenStyle?.color ?? null,
      tokenOwn: tokenStyle?.getPropertyValue('--0').trim() ?? null,
    };
  });

/**
 * The facts a styled code block must produce, checked against the page's own values.
 *
 * Split out from the read so the with-network and without-network runs assert the same
 * conditions rather than the same numbers — see `stylesTheSameWithAndWithout`.
 */
const expectFullyStyled = (facts, { route, viewport }) => {
  const where = `${route} at ${viewport.width}px`;

  expect(facts.blockCount, `${where} rendered no expressive-code block`).toBeGreaterThan(0);
  expect(facts.tokenColor, `${where} has no syntax token to colour`).not.toBeNull();

  /* The theme half: custom properties declared on the `.expressive-code` root. */
  expect(
    facts.codeBg,
    `--ec-codeBg did not resolve on ${where}, so no theme rules applied`,
  ).toMatch(/^#[\da-f]{6}$/iu);

  /* The base half: the rule that consumes it, applied rather than merely declared. */
  expect(
    facts.preBackground,
    `the code block on ${where} is not painted with --ec-codeBg, so no base rules applied`,
  ).toBe(toRgb(facts.codeBg));

  /*
   * A `calc()` over two custom properties from two halves of one stylesheet. This is the
   * assertion that a sheet present but unapplied cannot satisfy.
   */
  expect(
    facts.preRadius,
    `the code block radius on ${where} is not a resolved length, so --ec-brdRad never applied`,
  ).toMatch(/^[\d.]+p[xm]$/u);

  expect(facts.codeFamily, `the code block on ${where} has no monospace face`).toContain(
    'ui-monospace',
  );

  /* And the token rule, which is the difference between a code block and a paragraph. */
  expect(
    facts.tokenColor,
    `syntax tokens on ${where} did not take their own colour, so the token rules are missing`,
  ).toBe(toRgb(facts.tokenOwn));
};

const completeWithoutStylesheets = async ({ page }) => {
  const requested = await refuseStylesheets(page);

  await page.goto(CODE_PAGE, { waitUntil: 'domcontentloaded' });

  const facts = await readCodeBlockFacts(page);
  expectFullyStyled(facts, { route: CODE_PAGE, viewport: page.viewportSize() });

  /*
   * No network idle, no settle helper, no timeout — a reader never needed the network to see a styled
   * code block, and waiting would be waiting for the very thing this asserts is unnecessary.
   */
  expect(
    requested,
    `${CODE_PAGE} asked for a stylesheet, so refusing them was not the whole story`,
  ).toEqual([]);
};

const linksNothingAfterTheHead = async ({ page }) => {
  for (const route of [CODE_PAGE, CODE_FREE_PAGE]) {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      /*
       * The whole document, not `document.head` — the difference from `critical-css.spec.mjs`, which could
       * only ask about the head: expressive-code's link was a body element, so a head-only question
       * reported green for the defect. Counted through the browser's DOM rather than by fetching the
       * HTML, so it is the parsed document being asked — a link the parser moved, or one injected at
       * runtime, shows up here and in no string test on the file.
       */
      const linked = await page.evaluate(() =>
        [...document.querySelectorAll('link[rel="stylesheet"]')].map(
          (link) => link.getAttribute('href') ?? '',
        ),
      );

      expect(linked, `${route} at ${viewport.width}px links a stylesheet`).toEqual([]);
      expect(
        await page.evaluate(() => document.head.querySelectorAll('link[rel="stylesheet"]').length),
        `${route} at ${viewport.width}px links CSS from its head`,
      ).toBe(0);
    }
  }
};

/**
 * The same page, with and without every stylesheet request refused, compared.
 *
 * Not a snapshot, for the reason `critical-css.spec.mjs` gives: the same facts are read from both loads
 * and compared against each other, so a theme change moves both sides together and this stays green,
 * while a sheet that stops arriving drops one side and goes red. A snapshot would go stale on every
 * content edit. `styleCount` and the link lists are excluded: the first is asserted as an exact 1 in the
 * no-network run instead, and comparing either would only assert that two identical builds are identical.
 */
const stylesTheSameWithAndWithout = async ({ page }) => {
  const read = async (refuse) => {
    if (refuse) {
      await refuseStylesheets(page);
    }
    await page.goto(CODE_PAGE, { waitUntil: 'domcontentloaded' });
    return readCodeBlockFacts(page);
  };

  const [withNetwork, withoutNetwork] = [await read(false), await read(true)];

  const comparable = (facts) => ({
    blockCount: facts.blockCount,
    codeBg: facts.codeBg,
    preBackground: facts.preBackground,
    preRadius: facts.preRadius,
    codeFamily: facts.codeFamily,
    tokenColor: facts.tokenColor,
    tokenOwn: facts.tokenOwn,
  });
  expect(comparable(withoutNetwork)).toEqual(comparable(withNetwork));
};

test.describe('cold load — a code block needs no stylesheet request', () => {
  test('no page links a stylesheet at all, at any width', linksNothingAfterTheHead);

  test('the code block is fully styled with every stylesheet refused', completeWithoutStylesheets);

  test(
    'the same block styles identically with and without the network',
    stylesTheSameWithAndWithout,
  );

  test('the sheet is inlined exactly once per page, never once per code block', async ({
    page,
  }) => {
    await page.goto(CODE_PAGE, { waitUntil: 'domcontentloaded' });

    /*
     * Duplication is the failure mode inlining invites: expressive-code emits per document, not per block,
     * and `CODE_PAGE` has two blocks. A build that emitted a sheet per group would double the markup on
     * this page and every other chapter, silently.
     */
    const facts = await readCodeBlockFacts(page);

    expect(facts.blockCount, `${CODE_PAGE} is expected to have more than one code block`).toBe(2);
    expect(
      facts.styleCount,
      `${CODE_PAGE} inlines expressive-code's sheet ${facts.styleCount} times`,
    ).toBe(1);
  });

  test('a page with no code block carries no expressive-code rules', async ({ page }) => {
    await page.goto(CODE_FREE_PAGE, { waitUntil: 'domcontentloaded' });

    /*
     * The dead-CSS check, at the level where it is observable in a browser: not "the selector does not
     * match anything" but "the rules were never delivered here". Inlining is normally applied site-wide,
     * so the home page paying 15.8 KB for rules it can never select is the obvious regression — and the
     * one a `base` layout fix would introduce without any markup assertion noticing.
     */
    const facts = await readCodeBlockFacts(page);

    expect(facts.blockCount, `${CODE_FREE_PAGE} is expected to have no code block`).toBe(0);
    expect(
      facts.codeBg,
      `${CODE_FREE_PAGE} resolved expressive-code custom properties, so its rules were delivered`,
    ).toBeNull();
    expect(facts.styleCount, `${CODE_FREE_PAGE} inlined an expressive-code stylesheet`).toBe(0);
  });
});
