/*
 * The route skeleton's vocabulary, in one place.
 *
 * Three page types produce three different first screens, and the loader has to
 * pick between them before the fetch starts. The shape names, the bar class and
 * the URL rule were three separate facts spread across three components and a
 * controller, which is three places for the skeleton's markup and its behaviour to
 * disagree about what page they are standing in for.
 *
 * The class string lives here rather than in a stylesheet because it is not a
 * style: it is a mark-up contract between the component that draws the rows and
 * the stylesheet that only decides which shape is displayed. Same for the shape
 * names, which are half of the `data-skeleton` / `data-skeleton-shape` pair.
 */

/*
 * Every bar carries the pulse, so the whole skeleton breathes as one object: same
 * duration, same phase, one animation per bar but a single visible rhythm. It is
 * what tells a reader the page is still arriving. `global.css` parks it at
 * `animation-play-state: paused` whenever the loader is not visible, so it costs
 * nothing while the loader is hidden, which is almost all of the time.
 */
const BAR_BASE = 'rounded-ui bg-rule-strong animate-pulse motion-reduce:animate-none';

export const SKELETON_BAR = `block ${BAR_BASE}`;

/*
 * The same bar, `inline-block`, for a row whose height comes from a line box.
 *
 * The site header's running head is 18.15px tall because its two children are
 * text spans on the body's 1.65 leading. A `block` bar inside a wrapper is 11px —
 * the block establishes no line box, so the wrapper has nothing to inherit the
 * leading from — and the whole reading surface landed 7px above where it belongs.
 * An inline-block bar puts a line box back around itself and the row is right
 * again, structurally, at whatever the reader's text scale makes it.
 */
export const SKELETON_BAR_INLINE = `inline-block ${BAR_BASE}`;

/*
 * `home`    the title block: display title, abstract, call to action, metadata
 * `section` a section index: breadcrumb, two-line title, the notebooks under it
 * `notebook` a notebook page: breadcrumb, one-line title, prose, a code frame
 *
 * `notebook` is the default because it is the shape of 25 of the 38 pages, so a
 * navigation the URL rule cannot classify is far more likely to be one than not.
 */
export const SKELETON_SHAPES = ['home', 'section', 'notebook'];
export const DEFAULT_SKELETON = 'notebook';

const SECTION_NAMES = /^\d{2}-/u;

/*
 * `?query` and `#hash` are not part of a destination's identity. Every in-page
 * link to a section index is `/01-proven-techniques/#some-heading`, and every
 * search hit is `/01-proven-techniques/?q=xplan`; without this the second
 * segment is `some-heading` or `q=xplan` and every one of them is a "notebook".
 */
function pathnameOf(destination) {
  if (typeof destination === 'string') {
    return destination.split(/[?#]/u)[0];
  }
  return String(destination?.pathname ?? '').split(/[?#]/u)[0];
}

function segmentsOf(destination) {
  return pathnameOf(destination).split('/').filter(Boolean);
}

/*
 * Classify a destination.
 *
 * `astro.config.mjs` sets `trailingSlash: 'always'` and the content ids are
 * `NN-section` for a section and `NN-section/NN-notebook` for a page inside one,
 * so the segment count is the page type. The numeric prefix is checked as well
 * rather than trusted: it is what distinguishes the eight section indexes from
 * any other single-segment path, and a wrong answer here is a skeleton standing
 * in the wrong place, which is the failure this whole feature exists to remove.
 *
 * `/404` is the one page that is neither — it has no breadcrumb and no section —
 * and it is a single segment, so it is named rather than inferred. It is given
 * the notebook shape: prose under a title is closer to it than a list of
 * notebooks is.
 */
export function skeletonForPath(destination) {
  const segments = segmentsOf(destination);
  if (segments.length === 0) {
    /* Only the site root is a hero. A destination we cannot read at all — no
       pathname, a `URL` from a browser that gave us nothing — is NOT the home
       page, and answering "hero" for it would put a display-size title block on
       top of whatever the reader was opening. */
    return pathnameOf(destination) ? 'home' : DEFAULT_SKELETON;
  }
  if (segments.length > 1) {
    return 'notebook';
  }
  if (segments[0] === '404') {
    return 'notebook';
  }
  return SECTION_NAMES.test(segments[0]) ? 'section' : 'notebook';
}
