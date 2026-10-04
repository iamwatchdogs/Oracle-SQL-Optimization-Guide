/*
 * Reading a build's anchors: the landmark slices, the elements themselves, and the eligibility rule.
 *
 * A sibling of `test/support/fonts.mjs` and for the same reason: which faces go on the critical path is not
 * a property of any one source file, and neither is which links prefetch. It is a fact about
 * `astro.config.mjs`, about the `data-astro-prefetch` marks in the components, and about the runtime Astro
 * bakes into `dist/_astro/prefetch.*.js`. The other two halves of that fact are `prefetch-build.mjs`, which
 * reads the config and the bundle, and `prefetch-roles.mjs`, which is the table of what each link role is for.
 *
 * Astro 7.3.3 has no `prefetch.selector` — the config type is
 * `boolean | { prefetchAll?, defaultStrategy? }` (`node_modules/astro/dist/types/public/config.d.ts:1917-1964`)
 * — so eligibility is `data-astro-prefetch` presence plus `prefetchAll`, and this module reimplements the half
 * of `elMatchesStrategy` (`node_modules/astro/dist/prefetch/index.js:161-177`) that decides it. It is
 * reimplemented rather than imported because Astro's module reads `__PREFETCH_PREFETCH_ALL__` at its top level, a
 * placeholder only the bundler ever substitutes.
 */
/** The attribute Astro reads. `dataset.astroPrefetch` at `prefetch/index.js:163`. */
export const PREFETCH_ATTR = 'data-astro-prefetch';

/**
 * Regions, found by slicing from an attribute that names them to the matching close tag.
 *
 * A slice and not a parser, because every region here is a landmark whose name is in the markup by
 * accessibility contract rather than by our convenience: `nav[aria-label="Book sections"]` is the header's
 * section list, `nav[aria-label="Book navigation"]` the pager, `<section
 * aria-labelledby="contributions-heading">` the home contents list. A test locating them by class name would
 * assert a styling decision; these are the names a screen-reader user picks them out by.
 *
 * `<article>` is the one whose close tag is not a landmark: its contents are exactly the rendered markdown
 * (`[...slug].astro:470-500`), which makes it the prose boundary by construction rather than by a marker
 * planted inside it. `<header>` and `<footer>` are read whole, so their roles narrow by their own attributes.
 */
export const LANDMARKS = {
  sectionNav: ['aria-label="Book sections"', '</nav>'],
  pager: ['aria-label="Book navigation"', '</nav>'],
  contributions: ['aria-labelledby="contributions-heading"', '</section>'],
  breadcrumb: ['aria-label="Breadcrumb"', '</nav>'],
  article: ['<article', '</article>'],
  main: ['<main', '</main>'],
  header: ['<header', '</header>'],
  footer: ['<footer', '</footer>'],
  evidenceKey: ['id="evidence-key"', '</details>'],
};

/**
 * Every anchor ELEMENT, as `{ at, tag, href, text }`.
 *
 * The closing tag is matched too, which an opening-tag-only shape cannot do, and three roles need it: the
 * end-of-book fallback and "← Book home" are identified by the words inside them (`PrevNext.astro:133`,
 * `[...slug].astro:539`), and the prose region's anchors need their text. Safe because no anchor here nests
 * another — the section nav cells, contributions rows and pager cells hold spans and nothing else — so the
 * first `</a>` after an `<a>` is its own.
 */
export const anchorElementsOf = (html, from = 0) =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gu)].map((match) => {
    const [, attributes, inner] = match;
    return {
      /*
       * `at` is the anchor's CHARACTER OFFSET in the page, and it is the only reliable identity an anchor
       * has here. The opening tag is not: a chapter's prose renders `<a href="/…/">` with nothing else often
       * enough that two different cross-references come out byte-identical, and
       * `prefetch-eligibility.test.mjs` measured 8 of them collapsed into one until this was added. `href` is
       * not an identity either — the pager's `prev` is usually the section index the reader is inside.
       *
       * An offset rather than a rank, because `anchorsIn` reads a SLICE of the page and a rank inside a
       * slice collides with the same rank in every other slice — the first version numbered anchors per call
       * and the exhaustiveness check reported 17 phantom omissions on one page. `from` carries the slice's own
       * start so the number stays a position in the document.
       */
      at: from + match.index,
      tag: `<a${attributes}>`,
      href: /\bhref="([^"]*)"/u.exec(attributes)?.[1] ?? '',
      text: inner
        .replaceAll(/<[^>]*>/gu, '')
        .replaceAll(/\s+/gu, ' ')
        .trim(),
    };
  });

/** Every anchor opening tag — for the one assertion needing only a count — and the anchors in one landmark. */
export const anchorTagsOf = (html) => [...html.matchAll(/<a\b[^>]*>/gu)].map(([tag]) => tag);

export const anchorsIn = (html, [marker, closeTag]) => {
  const start = html.indexOf(marker);
  if (start < 0) {
    return [];
  }
  const end = html.indexOf(closeTag, start);
  /* `start` is passed through so `at` stays an offset into the whole document. See `anchorElementsOf`. */
  return anchorElementsOf(end < 0 ? '' : html.slice(start, end), start);
};

/**
 * Is this anchor eligible under Astro's own rule?
 *
 * `elMatchesStrategy`, reduced to the eligibility question — the strategy comparison is `defaultStrategy`'s
 * business and lives in the test that reads the config. A valueless `data-astro-prefetch` is `""`, so a bare
 * attribute is eligible; `"false"` is the documented opt-out (`config.d.ts:1937-1941`), honoured so a future
 * opt-out is not a red test.
 */
export const isPrefetchEligible = ({ tag }) => {
  const declared = /\bdata-astro-prefetch="([^"]*)"/u.exec(tag)?.[1];
  if (declared === 'false') {
    return false;
  }
  return new RegExp(`\\b${PREFETCH_ATTR}\\b`, 'u').test(tag);
};

/** Every eligible anchor on a page, in document order. */
export const eligibleAnchors = (html) =>
  anchorElementsOf(html).filter((anchor) => isPrefetchEligible(anchor));
