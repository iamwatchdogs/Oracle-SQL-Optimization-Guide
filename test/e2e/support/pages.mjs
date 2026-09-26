/**
 * Canonical page routes for the e2e suite.
 *
 * These live in one module because a spec that hard-codes a route and another
 * spec that asserts against the same page can drift: `FIRST_PAGE` was declared
 * privately in `pager-and-404.spec.mjs` and then referenced by
 * `not-found.spec.mjs`, which had no way to see it and failed with
 * `ReferenceError: FIRST_PAGE is not defined` in all four browser projects.
 */
export const FIRST_PAGE = '/00-preface/01-why-evidence-grades/';
