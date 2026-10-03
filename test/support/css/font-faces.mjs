/*
 * Which self-hosted face an element in a built page actually paints in.
 *
 * The consumer is `test/integration/font-preload.test.mjs`, and this is a module rather than a hundred lines
 * inside it because the answer needs FOUR things from three places: the built markup, the `@font-face`
 * declarations the build inlined, the cascade resolver in `./css-cascade.mjs`, and the fact that this
 * project's `--face-*` variables are the join between a CSS family name and a file.
 *
 * ── "ABOVE THE FOLD" HERE IS THE HEAD REGION, AND WHY ──
 *
 * A viewport is geometric and nothing here has a browser, so it cannot measure one. What it CAN measure from
 * the markup is the HEAD REGION: the `<header>` subtree plus the page's first `<h1>`. The numbers that make
 * that stand-in defensible were measured in a browser and are asserted there —
 * `test/e2e/font-preload.spec.mjs` reports the real first viewport on every route at two widths: the header
 * is `sticky top-0`, so it is in the first viewport on all 37 content pages by construction; and the `<h1>`
 * measured y=99 on a 390x844 phone viewport on every page, inside the fold with 745px to spare.
 *
 * Two ways this could have flattered a result, both closed in the code below: elements inside a CLOSED
 * `<details>` panel are excluded, so a face cannot look used because only the nav dropdown wants it; and the
 * region resolving to exactly three faces is asserted BEFORE any of them is asserted to be preloaded, so
 * "every used face is preloaded" cannot be satisfied by a resolver returning nothing.
 *
 * ── WHAT IT IS NOT ──
 *
 * A DOM-order truncation at the first `<pre>`, `<table>` or `<blockquote>` was written and discarded. It
 * sounds more conservative and is not: the boundary moves on every page, it missed the conclusion card on all
 * seven pages where that card is inside the fold, and it called a quote starting below the fold "above" it.
 * A definition whose boundary moves cannot decide whether one face is spent well.
 *
 * ── TWO PLACES THE CASCADE RESOLVER STOPS ──
 *
 * `css-cascade.mjs:170-176` recognises only the bare `var(--name)` form, so a `var()` WITH a fallback comes
 * back as the raw expression — the common case here, since `src/styles/global.css:468` writes
 * `--font-serif: var(--face-serif, 'Source Serif 4', Georgia, serif)`. Reading the `--face-*` name out of
 * whatever string comes back answers it, because the name is present either way. And `inherit` declares
 * nothing, so it must not end the walk. Both are handled in `facePaintedBy`, and neither by changing
 * `css-cascade.mjs`, which twenty other integration tests resolve properties through.
 */
import path from 'node:path';
import { fromHtml } from 'hast-util-from-html';
import { resolveToken } from './css-cascade.mjs';
import { fontFaceRules, pageCss } from '../fonts.mjs';

/** One CSS family name out of a value, unquoted.
 *
 *  lightningcss quotes a family only when it has to: `"Source Serif 4-2241a5b85ee54f8f"` has spaces and is
 *  quoted, `Inter-86155b4f3141ff2c` is one valid identifier and is not. A reader that assumed quotes
 *  resolves two of the four faces to an empty string and quietly proves nothing about them.
 */
const unquote = (value) => (value ?? '').trim().replaceAll(/^["']|["']$/gu, '');

/** Face variable to the family names it names, from the `--face-*` custom properties.
 *
 *  The variables are the join between the stylesheet and the files: `--face-serif` is what
 *  `src/styles/global.css:468` composes into `--font-serif`, and its value is the hashed family names the
 *  `@font-face` rules declare. Going through the variable rather than matching family-name prefixes is
 *  what lets this work across a font bump — the hash is part of the name and changes with the font.
 */
const faceFamilies = (css) =>
  new Map(
    [...css.matchAll(/--face-(serif|sans|mono)\s*:([^;}]+)/gu)].map(([, face, value]) => [
      face,
      value
        .split(',')
        .map((part) => unquote(part))
        .filter(Boolean),
    ]),
  );

/** `(face, style)` to the file that serves it. Only rules with a `url(...)` count, so Astro's twelve
 *  metric-adjusted local fallback faces have no entry at all. */
const faceFiles = (html, css) => {
  const byFamily = new Map(
    [...faceFamilies(css)].flatMap(([face, names]) => names.map((name) => [name, face])),
  );
  const file = new Map();

  for (const rule of fontFaceRules(html)) {
    const face = byFamily.get(rule.family);
    if (face === undefined || rule.src === '') {
      continue;
    }
    file.set(`${face}|${rule.style}`, path.posix.basename(rule.src));
  }
  return file;
};

/**
 * A `ruleMatches` definition for a hast element, with its ancestors threaded.
 *
 * Ancestors are passed down rather than rebuilt per element because `createContext` re-derives the whole
 * ancestor chain on every `resolveToken` call. Order is nearest-first, as `css-selectors.test.mjs` uses.
 */
const definitionOf = (node, ancestors = []) => {
  const children = (node.children ?? [])
    .filter((child) => child.type === 'element')
    .map((child) => definitionOf(child));

  return {
    types: [node.tagName],
    classes: (node.properties?.className ?? []).filter(Boolean),
    ancestors,
    /* This element carries text of its own, as opposed to only holding some in a child. */
    hasText: (node.children ?? []).some(
      (child) => child.type === 'text' && child.value.trim().length > 0,
    ),
    /* This element or something under it does — which is what "a reader SEES this face" needs, because a
     * declaration on a wrapper is inherited by the text inside it. The prose `<blockquote>` is exactly this
     * case: `@tailwindcss/typography` puts `font-style: italic` on the quote, the quote's text is in a `<p>`
     * inside it, and an element that only looked for its own text nodes would report the home page as
     * rendering no italic at all. */
    containsText:
      (node.children ?? []).some(
        (child) => child.type === 'text' && child.value.trim().length > 0,
      ) || children.some((child) => child.containsText),
    children,
  };
};

/**
 * Which `--face-*` a definition paints in, walking up until something declares a family.
 *
 * `resolveToken` already resolves a custom property and already walks ancestors when no rule matches, so
 * the walk here covers the two cases it does not: `inherit`, which declares nothing and must keep looking,
 * and a `var()` with a fallback (see the header). `null` means a real family WAS declared and it is not
 * one of this project's — Tailwind's `--default-font-family` preflight stack, or expressive-code's
 * `--ec-*`. Those never trigger a network request, so they are correctly absent from the preload analysis
 * rather than treated as an unknown face.
 */
const facePaintedBy = (css, definition) => {
  for (const scope of [definition, ...definition.ancestors]) {
    const declared = resolveToken(css, scope, 'font-family');
    if (declared === null || declared === 'inherit') {
      continue;
    }
    return /--face-(serif|sans|mono)\b/u.exec(declared)?.[1] ?? null;
  }
  return null;
};

/** True when this definition sits inside a disclosure panel that stays closed until it is opened. */
const inClosedPanel = (definition) =>
  definition.ancestors.some((ancestor) => ancestor.types.includes('details'));

/**
 * Every element under `root` in the head region: anything inside a CLOSED `<details>` panel is dropped,
 * because a face only the nav dropdown wants must not look used above the fold. A page-wide walk does not
 * use this — a closed panel's text still renders in its face, so a whole-document question must not inherit
 * the exclusion.
 */
const elementsIn = (root) => {
  const out = [];
  const visit = (definition) => {
    if (!inClosedPanel(definition)) {
      out.push(definition);
    }
    for (const child of definition.children) {
      visit(child);
    }
  };
  visit(root);
  return out;
};

/** The first element of `type` in document order, with its ancestors replaced by the walked chain. */
const firstOfType = (definition, type) => {
  let found = null;
  const descend = (node, ancestors) => {
    if (found) {
      return;
    }
    if (node.types[0] === type) {
      found = { ...node, ancestors };
      return;
    }
    for (const child of node.children) {
      descend(child, [node, ...ancestors]);
    }
  };
  descend(definition, definition.ancestors);
  return found;
};

/**
 * The `<body>` of a built page, as an element definition with its whole subtree attached.
 *
 * Only the HEAD REGION is resolved through here, and staying inside it is a cost decision as much as a
 * correctness one. `resolveToken` tests an element against every rule in a 63 KB compiled sheet, so resolving
 * a whole 170 KB document this way measured 226 seconds across the thirty-eight pages — and a check that takes
 * four minutes is a check that stops being run. The questions that wanted a whole-document answer are asked
 * from the markup instead (the tripwire in `font-above-fold.test.mjs`) or by a browser (`font-preload.spec.mjs`).
 */
const bodyDefinition = (html) => {
  const tree = fromHtml(html);
  const document = tree.children.find((node) => node.type === 'element' && node.tagName === 'html');
  return definitionOf(
    document.children.find((node) => node.type === 'element' && node.tagName === 'body'),
  );
};

/** Count the `(face, style)` each element paints in, skipping elements in no face of this project. */
const countFaces = (css, elements) => {
  const painted = new Map();
  for (const element of elements) {
    const face = facePaintedBy(css, element);
    if (face === null) {
      continue;
    }
    const key = `${face}|${resolveToken(css, element, 'font-style') ?? 'normal'}`;
    painted.set(key, (painted.get(key) ?? 0) + 1);
  }
  return painted;
};

/**
 * Which file serves each `(face, style)` a page declares — the join, without the cascade.
 *
 * The cheap half of `headRegionFaces`, for the tests that only need to know WHICH BYTES a decision is about.
 * Reading the `@font-face` rules costs a regex pass over the page's inlined CSS; resolving the cascade costs a
 * parse of the document and a selector match per element, and the two tests that only needed the join were
 * paying for the second.
 */
export const fontFilesByFace = (html) => faceFiles(html, pageCss(html));

/**
 * The faces the head region paints in — `{ painted, file }`.
 *
 * `painted` maps each `(face, style)` key to the number of elements painting in it, so a failing assertion
 * can say "thirteen elements" rather than only naming a face. `file` maps each key to the file that serves
 * it, resolved through this build's own `@font-face` rules rather than a name typed in here, so a font bump
 * moves the answer and not the test.
 */
export const headRegionFaces = (html) => {
  const css = pageCss(html);
  const body = bodyDefinition(html);
  const region = ['header', 'h1'].flatMap((type) => {
    const found = firstOfType(body, type);
    return found ? elementsIn(found) : [];
  });

  return { painted: countFaces(css, region), file: faceFiles(html, css) };
};
