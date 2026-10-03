/*
 * The code-block stylesheet, as the production build actually ships it.
 *
 * A sibling of `render-blocking-css.test.mjs`, split because the two stylesheets reach the reader by
 * different mechanisms and that difference is the whole subject. That test covers the global sheet, which
 * Astro collects as a build asset; this one covers expressive-code's sheet, which Astro never sees — it
 * writes raw hast into the markdown AST and hands Astro a finished `<link>` to print.
 *
 * THE DEFECT. `emitExternalStylesheet` defaults to `true`
 * (`node_modules/astro-expressive-code/dist/index.d.ts:45`), and on that setting the rehype hook
 * pushes a `<link rel="stylesheet">` onto the front of the FIRST rendered code block group —
 * `renderData.groupAst.children.unshift(...extraElements)`, `dist/index.js:135-166`. Because the
 * node lands in the content AST, the tag is serialised inside `<body>` at the position of the first
 * code block. Measured on `/00-preface/01-why-evidence-grades/`: offset 137,618 of a 170,536-byte
 * document, 80.7% of the way in — so a parser consumed two thirds of the page before finding a
 * render-blocking stylesheet, then paid a second round-trip for 15,817 bytes raw / 3,823 gzip.
 * Thirty-four of thirty-eight pages had it; the four that did not have no code block, because the hook
 * is guarded by `isFirstGroupInDocument` (`dist/index.js:136`) — the per-page conditional the fix
 * relies on, and already the package's own behaviour.
 *
 * Asserted below, in the order a reader would want them: the link is gone from the whole site rather
 * than moved; the rules still arrive on a code page, whole, once per page; a page with no code block
 * carries none of them; they arrive before the first code block; nothing is left on disk and the inline
 * bytes are bounded; and the sheet is still a body element.
 * That last item, stated here rather than discovered later: expressive-code's own `false` branch
 * (`dist/index.js:148-155, 186-191`) writes a `<style>` into the same AST slot the `<link>` occupied, as
 * the first child of the `<div class="expressive-code">` wrapper, at 73.9% of the document and after
 * the `<h1>`, with byte-identical CSS to the old `ec.b93kz.css`. What the change removes is the
 * render-blocking request and the round-trip; what remains is the distance the parser walks first.
 * `astro.config.mjs` records why no supported mechanism closes that distance.
 */
import path from 'node:path';
import { beforeAll, expect, test } from 'vitest';
import {
  afterHead,
  buildIsCurrent,
  distRoot,
  ensureBuild,
  inHead,
  inlineStyleBlocks,
  loadBuiltPages,
  loadEmittedStylesheets,
  stylesheetLinks,
  hrefOf,
  walk,
} from '../support/built-site.mjs';

/**
 * Three markers only expressive-code's compiled stylesheet can produce, one per layer so a fragment
 * cannot satisfy all three, and transcribed from the 15,817-byte sheet this build emitted before the
 * change rather than read from `dist/` — a test reading its markers from the artifact it asserts against
 * could only run in the broken configuration.
 *
 *   - `.expressive-code{`, the first rule of the BASE stylesheet.
 *   - `--ec-uiFontFml`, a theme custom property. Nothing else in this project declares an `--ec-`
 *     name; `tailwind-source-closure.test.mjs` searches `src/styles/global.css`.
 *   - `:root:not([data-theme='github-dark'])`, which appears only in the THEME stylesheet and only
 *     because the config says `themes: ['github-dark']`. Change the theme and this fails, which is
 *     intended: it asserts the rules in the page are the rules the site ships.
 */
const EXPRESSIVE_CODE_MARKERS = [
  '.expressive-code{',
  '--ec-uiFontFml',
  ":root:not([data-theme='github-dark'])",
];

/** The group wrapper expressive-code emits, and the frame it wraps the code block in. */
const CODE_BLOCK_ROOT = '<div class="expressive-code"';
const CODE_BLOCK_FRAME = '<figure class="frame"';

/**
 * A floor on how much of the sheet arrived, in `--ec-` declarations. The compiled sheet defines 192;
 * the base stylesheet without its theme defines far fewer and would still satisfy all three markers, so
 * the markers alone cannot prove the sheet is whole. 150 is four fifths of the real count.
 */
const MIN_EC_DECLARATIONS = 150;

/**
 * The ceiling on expressive-code's inlined bytes per page: 15,817 measured, 20 KiB asserted. Room for a
 * theme bump, none for a second copy — and a second copy is invisible to every other assertion here. The
 * margin is deliberately small: expressive-code recomputes this string from its own theme on every
 * release, so a generous ceiling would track a file it does not own.
 */
const EC_INLINE_CEILING = 20 * 1024;

const byteLength = (text) => Buffer.byteLength(text, 'utf8');

/** The `<style>` elements in a page carrying expressive-code's rules, with positions. */
const ecStyleBlocks = (html) =>
  inlineStyleBlocks(html).filter((block) => block.body.includes('--ec-uiFontFml'));

const ecDeclarations = (css) => css.match(/--ec-/gu)?.length ?? 0;

const withCodeBlocks = (list) => list.filter(({ html }) => html.includes(CODE_BLOCK_ROOT));
const withEcStyles = (list) => list.filter(({ html }) => ecStyleBlocks(html).length > 0);

let pages = [];
let stylesheets = new Map();
let buildOrigin = '';

beforeAll(async () => {
  buildOrigin = await ensureBuild();
  [pages, stylesheets] = await Promise.all([loadBuiltPages(), loadEmittedStylesheets()]);
}, 180_000);

test('every built page is readable, and this is the build they were read from', async () => {
  /*
   * The vacuity guard, first because every assertion below iterates `pages`. An empty list passes all of
   * them, and an empty list is what a missing `dist/` produces — a check going silent in the configuration
   * a fresh clone is in. The build is named so a reader of a red test knows what they are looking at.
   */
  expect(pages.length, 'the built site has no pages to check').toBeGreaterThan(30);
  expect(buildOrigin, 'the build was never resolved').toMatch(
    /^built dist\/|^reused the build|^waited for another test file/u,
  );
  expect(await buildIsCurrent(), 'the build on disk predates the config that shaped it').toBe(true);
});

test('no page carries a stylesheet link after its head, on any page', () => {
  /*
   * THE DEFECT, counted: before the change thirty-four of thirty-eight pages had one of these, at the
   * position of the first code block. Counted site-wide and reported as offenders rather than a total,
   * so a regression says which pages. An exact `[]`, not a bound: the correct value is zero, and a
   * bound permitting one permits the regression the change removes.
   */
  const late = pages.flatMap(({ file, html }) =>
    stylesheetLinks(afterHead(html)).map((tag) => `${file} → ${hrefOf(tag)}`),
  );

  expect(late).toEqual([]);
});

test("no page links expressive-code's stylesheet, and no stylesheet file survives", async () => {
  /*
   * The same defect from the other end, because "zero links after `</head>`" is satisfied just as well
   * by MOVING the link: expressive-code could start writing it into the head and every assertion above
   * would go green while the reader's blocking request stayed as it was. So: nothing anywhere links an
   * `_astro/ec.*` URL, and no such file is in `dist/`. Its own filename is deliberately not pinned —
   * `ec.b93kz.css` is a hash of the sheet's bytes; the pattern is the documented contract
   * `/_astro/ec.{hash}.css` (`dist/index.d.ts:59`).
   */
  const linkedEc = pages.flatMap(({ file, html }) =>
    stylesheetLinks(html)
      .filter((tag) => /\/ec\.[\da-z]+\.css/u.test(hrefOf(tag)))
      .map((tag) => `${file} → ${hrefOf(tag)}`),
  );
  expect(linkedEc).toEqual([]);

  const ecFiles = [...stylesheets.keys()].filter((name) => /^ec\.[\da-z]+\.css$/u.test(name));
  expect(ecFiles, 'expressive-code still emits a stylesheet file nothing links').toEqual([]);

  /*
   * And walk the directory, so a file outside `dist/_astro/` is caught instead of being invisible to a
   * lookup keyed on `path.basename`. Scoped to `.css` because `_astro/ec.*.js` is not dead weight:
   * expressive-code emits a module beside the sheet (`dist/index.js:194-197`) carrying
   * copy-to-clipboard. The first draft asserted the whole `ec.` prefix absent and went red on it.
   */
  const onDisk = (await walk(distRoot)).filter(
    (file) => path.basename(file).startsWith('ec.') && file.endsWith('.css'),
  );
  expect(onDisk.map((file) => path.relative(distRoot, file))).toEqual([]);
});

test('a page with a code block carries the rules inline, whole, exactly once', () => {
  /*
   * Inlining is a change of delivery and both ways to get it wrong are silent: inline a fragment and
   * the block renders half-styled; emit per code block group and the page grows by 15.8 KB times its
   * block count. `/00-preface/01-why-evidence-grades/` has TWO blocks, so it is the page that would
   * show the second failure.
   *
   * All three markers in ONE `<style>` element, not one occurrence each: the base and theme stylesheets are
   * separate strings inside expressive-code, and a build inlining them into two adjacent blocks would be
   * correct but would fail here. Accepted — one element is what `dist/index.js` emits.
   */
  const carrying = withEcStyles(pages);
  expect(carrying.length, 'no built page carries expressive-code rules at all').toBeGreaterThan(30);

  for (const { file, html } of carrying) {
    const blocks = ecStyleBlocks(html);
    expect(blocks.length, `${file} carries the rules in ${blocks.length} <style> elements`).toBe(1);

    const [sheet] = blocks;
    for (const marker of EXPRESSIVE_CODE_MARKERS) {
      expect(
        sheet.body.includes(marker),
        `${file} does not carry "${marker}" in its expressive-code <style>`,
      ).toBe(true);
    }
    expect(
      ecDeclarations(sheet.body),
      `${file} inlines only ${ecDeclarations(sheet.body)} of the sheet's --ec- declarations`,
    ).toBeGreaterThanOrEqual(MIN_EC_DECLARATIONS);
  }
});

test('a page without a code block carries none of the rules', () => {
  /*
   * The other direction, and the one a layout-level fix breaks. expressive-code's guard means a code-free
   * page carries no part of the sheet; inlining PRESERVED that, while injecting the sheet from
   * `BaseLayout.astro` would have destroyed it — recorded in `astro.config.mjs`. Held on a count as
   * well as a direction, so the loop has something to iterate.
   */
  const codeFree = pages.filter(({ html }) => !html.includes(CODE_BLOCK_ROOT));
  expect(codeFree.length, 'no built page is free of code blocks, so this proves nothing').toBe(4);

  for (const { file, html } of codeFree) {
    for (const marker of EXPRESSIVE_CODE_MARKERS) {
      expect(
        ecStyleBlocks(html).some((block) => block.body.includes(marker)),
        `${file} has no code block but still carries expressive-code's "${marker}"`,
      ).toBe(false);
    }
  }
});

test('the rules arrive before the first rendered code block, never after it', () => {
  /*
   * PLACEMENT, the assertion the change turns on — with the reasoning for why it is not "inside
   * `<head>`". A stylesheet arriving after the markup it styles paints the page twice, and the browser
   * is holding the document by the time it parses the body, so a body stylesheet is strictly later than
   * a head one. expressive-code's `<style>` is in the body and this change does not move it there, so
   * asserting `<head>` would assert a fix nobody made.
   *
   * The boundary is the CODE FRAME, not the group root, and getting that wrong was worth the trip it
   * caused: expressive-code attaches the sheet as the first CHILD of the wrapper div, so the root's
   * opening tag precedes the `<style>` by 29 bytes on the measured page. The frame is the first element
   * in the group that expressive-code's rules select AND that has content — the wrapper is empty when the
   * parser reaches the `<style>`, so nothing can paint unstyled. The weaker alternatives, named so this
   * is not mistaken for them: "no `<style>` anywhere after the first block" passes on a page whose sheet
   * sits a megabyte past the prose; "earlier than the `<h1>`" changes nothing a reader could see, since
   * the prose above the first block is styled entirely by the global sheet in the head — and it would
   * cost a plugin that cannot work anyway, expressive-code PUSHES ITSELF last (`dist/index.js:512`).
   */
  for (const { file, html } of withCodeBlocks(pages)) {
    const firstFrame = html.indexOf(CODE_BLOCK_FRAME);
    const [sheet] = ecStyleBlocks(html);

    expect(sheet, `${file} has a code block but no expressive-code <style>`).toBeDefined();
    expect(
      sheet.at,
      `${file} applies the rules ${sheet.at - firstFrame} bytes AFTER its first code frame`,
    ).toBeLessThan(firstFrame);
  }
});

test('the inlined sheet is bounded, so a second copy would fail', () => {
  /*
   * The duplication check that catches what the others cannot: the sheet arriving as an inline `<style>`
   * AND as an unlinked file, or as two inline blocks on one page. The file assertions rule out the
   * first; this is the numeric backstop, and it also catches a third copy in another shape.
   */
  for (const { file, html } of pages) {
    const inlined = ecStyleBlocks(html).reduce((total, b) => total + byteLength(b.body), 0);

    expect(
      inlined,
      `${file} inlines ${inlined} bytes of expressive-code CSS, over the ${
        EC_INLINE_CEILING / 1024
      } KiB ceiling`,
    ).toBeLessThanOrEqual(EC_INLINE_CEILING);
  }
});

test('the code-block sheet is a body element, and this test says so out loud', () => {
  /*
   * The residual, pinned so it cannot be quietly forgotten: this is the one thing the change does NOT do,
   * and a suite that only asserted what got better would let it read as though it did. Same tripwire
   * shape the previous commit used for this defect: if a future Astro grows a channel to `<head>`, this
   * goes red, and the message says what to do.
   */
  const carrying = withEcStyles(pages);
  expect(
    carrying.length,
    'no page carries expressive-code rules, so the placement claim is untested',
  ).toBeGreaterThan(30);

  for (const { file, html } of carrying) {
    const [sheet] = ecStyleBlocks(html);

    expect(
      sheet.at > html.indexOf('</head>'),
      `${file} inlines the rules inside <head> now — delete this test and the note in astro.config.mjs`,
    ).toBe(true);
  }
});

test('nothing links a stylesheet from the head either, so the site fetches no CSS at all', () => {
  /*
   * The whole-site statement, and the reason `inHead` is imported at all. The sibling test already
   * asserts this for the global sheet; repeating it here would be duplication, except that this file's
   * subject is the code-block sheet and one test should answer "does this site fetch any CSS?".
   */
  expect(
    pages.flatMap(({ file, html }) =>
      stylesheetLinks(inHead(html)).map((tag) => `${file} → ${hrefOf(tag)}`),
    ),
  ).toEqual([]);
});
