/**
 * Selectors for the route loader.
 *
 * One definition, because a spec that hard-codes the selector and another spec
 * that asserts against the same element can drift — the same failure mode
 * `support/viewports.mjs` exists to prevent for viewports.
 */
export const LOADER = '[data-route-loader]';

export const LOADER_MESSAGE = '[data-route-loader-message]';
