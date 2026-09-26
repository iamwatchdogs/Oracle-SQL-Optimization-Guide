/**
 * Shared table-of-contents fixtures.
 *
 * The reading TOC is asserted from three spec files (truncation, scroll-spy,
 * interaction and structure behaviour), and all three need the same two routes,
 * the same viewports and the same two "currently active" selectors. Keeping them
 * here is what lets each spec stay short enough to read in one screen.
 */

/** The flagship page: 18 `####` steps, so it is the deepest TOC in the book. */
export const ARTICLE = '/00-preface/02-how-to-prove-a-win/';

/** A mid-book page, used wherever a short TOC is enough. */
export const SECTION = '/01-proven-techniques/01-measure-first/';

export const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
export const PHONE_VIEWPORT = { width: 390, height: 844 };

/** The desktop rail's current link. */
export const ACTIVE_LINK = 'aside.toc-viewport [data-toc-link][data-active="true"]';

/** The mobile disclosure's current link — tracked independently of the rail. */
export const MOBILE_ACTIVE_LINK = '[data-toc-mobile] [data-toc-link][data-active="true"]';

/** The accessible name of the rail's current link, or `null` when none is set. */
export const activeLabel = (page) => page.locator(ACTIVE_LINK).first().textContent();
