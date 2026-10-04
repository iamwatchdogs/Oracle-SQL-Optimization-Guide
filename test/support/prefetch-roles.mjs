/*
 * The scope, as a table: every link role this project ships, whether the design intends it to prefetch, and
 * why — one row per role, with the `file:line` that decides it.
 *
 * WHY A TABLE AND NOT THREE REGEXES IN EACH TEST, which is the shape every other reader of `dist/` in this
 * repository takes and the shape that would have been wrong here. Astro 7.3.3 has no `prefetch.selector`: the
 * config type is `boolean | { prefetchAll?, defaultStrategy? }` and nothing else
 * (`node_modules/astro/dist/types/public/config.d.ts:1917-1964`), and eligibility is the whole of
 * `elMatchesStrategy` (`node_modules/astro/dist/prefetch/index.js:161-177`):
 *
 *   if (attrValue === "false") return false;
 *   if (attrValue == null && prefetchAll || attrValue === "") return strategy === defaultStrategy;
 *   if (attrValue === strategy) return true;
 *
 * Presence of the attribute plus `prefetchAll`, and no CSS anywhere in the decision. The one selector in
 * Astro's prefetch code is the hardcoded pair in `speculation-rules.js:2` —
 * `prefetchAll ? "a" : "a[data-astro-prefetch]"` — reachable only with `experimental.clientPrerender`, which
 * this project does not set. So a test written against a `selector` in the config asserts a mechanism that
 * does not exist, and the scope has to be stated somewhere else. It is here, as data, so that a link added to
 * the project lands in an existing row or in no row at all — and the second case is a red test in
 * `prefetch-eligibility.test.mjs` rather than a silent change of what prefetches.
 *
 * `anchors` returns that role's anchors on a page. `prefetch-eligibility.test.mjs` drives the table: every
 * role's anchors carry exactly the `prefetch` value claimed here, the roles account for EVERY anchor on every
 * page, and each role is non-empty somewhere. `rel`, `data-toc-link` and these strings are each set in one
 * place in the project and the regions do not overlap — but an anchor found twice would be counted twice, so
 * the exhaustiveness check compares the union's SIZE against the page's anchor count.
 *
 * A sibling of `prefetch.mjs`, which is the READER this table is written against, and of `prefetch-build.mjs`,
 * which reads the config and the bundle. Which links prefetch is a fact about three files at once, and this
 * repository's linter holds each file to 300 lines.
 */
import { anchorElementsOf, anchorsIn, LANDMARKS } from './prefetch.mjs';

const matches = (anchor, pattern) => pattern.test(anchor.tag);
/* Matched UNANCHORED on purpose for the two roles identified by their words. Both wrap a decorative glyph in
 * `<span aria-hidden="true">` — PrevNext.astro:133 and [...slug].astro:539 both open with `←` — so the
 * anchor's text starts with the arrow and a `^` anchor would silently match nothing. */
const says = (anchor, pattern) => pattern.test(anchor.text);
/* The wordmark is the only ANCHOR carrying `running-head` — the other uses are a `<legend>` and a `<p>`. */
const isWordmark = (anchor) => /\bclass="[^"]*\brunning-head\b/u.test(anchor.tag);
const inLandmark = (name) => (html) => anchorsIn(html, LANDMARKS[name]);
const tagged = (pattern) => (html) =>
  anchorElementsOf(html).filter((anchor) => matches(anchor, pattern));
const phrased = (pattern) => (html) =>
  anchorElementsOf(html).filter((anchor) => says(anchor, pattern));
/** `anchors` minus the anchors another role already claims, compared by document position. */
const without = (claimed) => (anchors) =>
  anchors.filter((anchor) => !claimed.some((other) => other.at === anchor.at));

export const ROLES = [
  {
    role: 'section nav',
    where: 'BaseLayout.astro:535 — nav[aria-label="Book sections"]',
    prefetch: true,
    why: `The book's table of contents and the reader's most likely jump out of a chapter. Nine links, the same
      nine as fallbackSections (BaseLayout.astro:54-64). It sits in a CLOSED <details> (BaseLayout.astro:459),
      so it has no box and is never observed until the reader opens it — one deliberate gesture warms nine
      destinations; a reader who never opens it pays nothing.`,
    anchors: inLandmark('sectionNav'),
  },
  {
    role: 'pager cell',
    where: 'PrevNext.astro:81,98 — rel="prev" and rel="next"',
    prefetch: true,
    why: `Two links at the foot of the reading column ([...slug].astro:520-533), reached by the scroll that means
      the reader is nearly done. rel is what distinguishes a pager hop from any other navigation here
      (PrevNext.astro:70-78), and so makes the cells findable in a flat list.`,
    anchors: tagged(/\brel="(?:prev|next)"/u),
  },
  {
    role: 'end-of-book fallback',
    where: 'PrevNext.astro:131',
    prefetch: true,
    /* A role that matches nothing is indistinguishable from a role whose finder is broken, so the fact is data
       and not a sentence: `prefetch-eligibility.test.mjs` allows a role to be absent from the whole site only
       when it says so here. It became true when the book grew a chapter after this component was written — the
       last page always has a `prev` — and it is pinned so a future `PrevNext.astro` change cannot leave the
       pager's fallback unmarked without anything going red. */
    absent: true,
    why: `The pager's own else branch, in the pager's slot, answering the pager's question. No page in this book
      renders it: PrevNext.astro:62 takes the pager branch whenever either neighbour exists, and the last page
      has a prev. So this measures zero anchors on all 38 pages and is asserted as such. Marked anyway, being
      the same element in the same position.`,
    anchors: phrased(/End of notebook/u),
  },
  {
    role: 'contents row',
    where: 'HomeTitleBlock.astro:283 — section[aria-labelledby="contributions-heading"]',
    prefetch: true,
    why: `Nine links on the home page, the same nine routes as the header's section list, so the runtime's
      prefetchedUrls set (prefetch/index.js:4,131) collapses them into nine fetches, not eighteen. Without it
      the door of the book would prefetch nothing: a reader arriving on / has no reason to open a dropdown to
      read a list already on the page.`,
    anchors: inLandmark('contributions'),
  },
  {
    role: 'begin at preface',
    where: 'HomeTitleBlock.astro:122 — the primary control in the title block',
    prefetch: true,
    why: `One link, on the home page only, and the most likely navigation a reader arriving at the door makes. Its
      destination, /00-preface/, is already eligible through the first contents row below it, so marking it
      costs no extra fetch — which is also the argument FOR it: leaving the one control out while marking the
      nine rows listing the same chapter would be a scope that depends on which of two links to one place the
      reader happened to be looking at. This row is here because the exhaustiveness check found the link
      belonging to no row at all.`,
    anchors: phrased(/Begin at Preface/u),
  },
  {
    role: 'in-page outline',
    where: 'ReadingToc.astro:65,128 — data-toc-link, on the desktop rail and the mobile disclosure',
    prefetch: false,
    why: `The largest group of anchors in the book: 818 across 38 pages, 34 on
      /00-preface/01-why-evidence-grades/ and 84 on /00-preface/02-how-to-prove-a-win/, which carries 18
      procedural #### steps. They cannot prefetch anything at all, which is why this is the clearest exclusion
      here rather than a judgement call: prefetch() strips the fragment (prefetch/index.js:128), so
      #how-this-page-is-banded becomes the page's own URL, and canPrefetchUrl rejects it because the pathname
      and search are unchanged (index.js:156). Each was an observer entry, a 300 ms timer and a no-op call.`,
    anchors: tagged(/\bdata-toc-link=/u),
  },
  {
    role: 'prose link',
    where: 'the rendered markdown — every anchor inside main that no other row claims',
    prefetch: false,
    why: `955 cross-references across the book — every internal link an author wrote into a chapter. Marking them
      would say a reader's likely next read is whatever a passing mention points at, the opposite of what a book
      says.

      Scoped to <main> MINUS the rows that also live there, and that composition is the fix for a real
      measurement: the row was first written as the <article> slice, which matches 14 anchors on a chapter page
      and NOTHING on the home page — no <article> there, its prose in a bare <div class="prose">
      ([...slug].astro:238) — and the exhaustiveness check reported 91 unclaimed anchors. <main> is the one
      region both page shapes share, and the breadcrumb, the pager cells, "← Book home", the "Full key" lookup
      and the 404's two controls are subtracted by position because each has its own row.`,
    anchors: (html) => {
      const claimed = [
        ...inLandmark('breadcrumb')(html),
        ...tagged(/\brel="(?:prev|next)"/u)(html),
        ...phrased(/Book home/u)(html),
        ...phrased(/Full key/u)(html),
        /* The 404's own two controls are inside its <main> too, and they have their own row — without this
           the exhaustiveness check reports them claimed twice on the one page that has them. */
        ...phrased(/Back to home|Source appendix/u)(html),
      ];
      return without(claimed)(inLandmark('main')(html));
    },
  },
  {
    role: 'breadcrumb',
    where: '[...slug].astro:415,455 — nav[aria-label="Breadcrumb"]',
    prefetch: false,
    why: `One or two links to the book root and the enclosing section index, both already offered by the wordmark
      and the section list. The trail sits in the first viewport on all 37 content pages, so marking it under a
      viewport strategy buys two unconditional fetches at load for a link a reader three paragraphs in does not
      want. Explicit rather than omitted: "the breadcrumb is chrome too" is the obvious objection to a scope
      this small.`,
    anchors: inLandmark('breadcrumb'),
  },
  {
    role: 'wordmark',
    where: 'BaseLayout.astro:374, inside header',
    prefetch: false,
    why: `The book root again, and in the first viewport on all 38 pages for the breadcrumb's reason. A reader
      mid-chapter does not go home; they go to the next chapter, which is what the pager is for.`,
    anchors: (html) => anchorsIn(html, LANDMARKS.header).filter((anchor) => isWordmark(anchor)),
  },
  {
    role: 'repository link',
    where: 'BaseLayout.astro:422 (header), SiteFooter.astro:35 (colophon)',
    prefetch: false,
    why: `Cross-origin, and canPrefetchUrl requires the same origin (prefetch/index.js:156), so a marked one would
      be a claim the runtime cannot keep. There are 76, two per page — the header control and the colophon
      link. Scoped to the chrome on purpose: the first version matched every external anchor on the page,
      swallowing the external citations inside the chapter's prose and claiming two roles for each.`,
    anchors: (html) =>
      [...anchorsIn(html, LANDMARKS.header), ...anchorsIn(html, LANDMARKS.footer)].filter(
        (anchor) => /^https?:\/\//u.test(anchor.href),
      ),
  },
  {
    role: 'evidence key',
    where:
      'HomeTitleBlock.astro:240,242 in details#evidence-key, and "Full key" at [...slug].astro:490',
    prefetch: false,
    why: `Two links on the home page inside the collapsed disclosure, plus the 36 chapter headers' "Full key", which
      points at /#evidence-key — the fragment is stripped by the runtime, so marking it would fetch the home page
      on the arrival of every chapter that carries one. All 38 answer one question, what the grade chips mean,
      and a reader opens any of them to look something up rather than to move through the book: a lookup
      surface, not a navigation path.`,
    anchors: (html) => [...inLandmark('evidenceKey')(html), ...phrased(/Full key/u)(html)],
  },
  {
    role: 'not-found control',
    where: '404.astro:27,34 — the two primary controls on the 404',
    prefetch: false,
    why: `"Back to home" and "Source appendix", and this row exists because the exhaustiveness check found them:
      the only two anchors on the site no earlier row claimed. Neither prefetches. Home is the wordmark's
      destination, excluded above on the same grounds, and the appendix is already in this page's own header
      list — 404.astro passes no sections, so navigationSections falls back to the same nine
      (BaseLayout.astro:54-64, :65) — so marking it would fetch a route the reader is offered twice, on the one
      page a reader reaches by following a citation that does not resolve.`,
    anchors: phrased(/Back to home|Source appendix/u),
  },
  {
    role: 'skip to content',
    where: 'BaseLayout.astro:332',
    prefetch: false,
    why: `href="#main", so by the runtime's own rule (index.js:128 then :156) it is the page the reader is already
      on. There is nothing it could fetch.`,
    anchors: tagged(/\bhref="#main"/u),
  },
  {
    role: 'book home',
    where: '[...slug].astro:535',
    prefetch: false,
    why: `The pager's younger sibling, offering the book root — the wordmark's destination a second time, on the 36
      pages that have a reading column. A reader at the foot of a chapter wanting the root has the pager's prev
      cell one line above, and it IS marked.`,
    anchors: phrased(/Book home/u),
  },
];
