/**
 * Shared viewports.
 *
 * These were hard-coded per spec, which is how the one horizontal-overflow
 * detector ended up running exclusively at 1280x720 while a real 390px overflow
 * bug shipped. A single definition means a viewport cannot drift between the
 * spec that sets it and the spec that asserts against it.
 */
export const MOBILE = { width: 390, height: 844 };
export const TABLET = { width: 768, height: 1024 };
export const DESKTOP = { width: 1280, height: 900 };
export const WIDE = { width: 1400, height: 900 };
