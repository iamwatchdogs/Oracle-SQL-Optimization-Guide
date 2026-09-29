import { resolveBase } from '../../../src/lib/site.mjs';

/**
 * A bare route, in the form the deployed site actually serves it at.
 *
 * Every route in this suite is written the way the book is written —
 * `/00-preface/`. Nothing in the served site is: `base` is set, so the pathname of
 * a real page is `/Oracle-SQL-Optimization-Guide/00-preface/`. This is the one
 * place the two are reconciled, for the same reason `src/lib/site.mjs` is the one
 * place the prefix itself is written.
 *
 * Applied where a test needs the *served* form — a `location.pathname` it waits
 * for, an `href` it reads back, a selector that has to match what the browser
 * really has. It is not applied to `page.goto`, because the static server answers
 * the bare path too and the specs read better without the repository name in them.
 * `built-links.spec.mjs` is what holds the guarantee that every link the browser
 * is actually offered carries the prefix.
 *
 * Idempotent, so it is safe on a value that already carries the base — a href read
 * out of the built HTML, for instance — and a no-op for a `SITE_BASE=/` build,
 * where `resolveBase()` is empty.
 */
export const deployed = (route) => {
  const base = resolveBase();
  if (base === '') {
    return route;
  }
  return route === base || route.startsWith(`${base}/`) ? route : `${base}${route}`;
};
