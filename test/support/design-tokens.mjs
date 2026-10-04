/**
 * Reading design tokens out of the compiled stylesheet.
 *
 * Shared by `design-tokens.test.mjs` and `control-edge.test.mjs`: both assert
 * different things about the same values, and both were at the file-length limit
 * with their own copies of this machinery.
 *
 * The values are re-derived from the compiled CSS rather than pinned as literals,
 * so a palette edit that quietly drops a pair below its floor fails a test instead
 * of shipping.
 */
import { normalizeHex, resolveToken } from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

/** The tokens any test here is allowed to read. */
export const THEME_TOKENS = [
  'paper',
  'paper-raised',
  'paper-sunken',
  'ink',
  'ink-muted',
  'ink-faint',
  'rule',
  'rule-strong',
  'control-edge',
  'accent',
  'accent-hover',
  'accent-ink',
  'zone-a',
  'zone-b',
  'zone-c',
  'zone-d',
  'zone-chip-bg',
  'selection-bg',
  'selection-fg',
  'scrollbar-thumb',
  'scrollbar-track',
];

const themeContext = (theme) => ({
  types: ['div'],
  classes: ['prose'],
  ancestors: [{ types: ['html'], attributes: { 'data-theme': theme } }],
});

/* ---- colour maths -------------------------------------------------- */
const srgb = (channel) =>
  channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const luminance = (hex) => {
  const channels = [1, 3, 5].map((index) =>
    srgb(Number.parseInt(hex.slice(index, index + 2), 16) / 255),
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

export const contrast = (foreground, background) => {
  const forward = luminance(foreground);
  const back = luminance(background);
  const [hi, lo] = forward > back ? [forward, back] : [back, forward];
  return (hi + 0.05) / (lo + 0.05);
};

/* ---- alpha compositing --------------------------------------------- */
/*
 * A token's value arrives in whichever form the stylesheet wrote it: the compiler
 * emits a literal `rgb(138 164 255 / 0.28)` as an 8-digit `#8aa4ff47`, so both
 * shapes have to parse or the translucent tokens measure as `NaN`.
 */
const channels = (value) => {
  const text = String(value).trim();
  const hex = /^#(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})(?<a>[0-9a-f]{2})?$/iu.exec(
    text,
  );
  if (hex) {
    const { r, g, b, a } = hex.groups;
    return {
      rgb: [r, g, b].map((part) => Number.parseInt(part, 16)),
      alpha: a === undefined ? 1 : Number.parseInt(a, 16) / 255,
    };
  }
  const parts = text
    .replace(/rgba?\(/u, '')
    .replace(')', '')
    .split(/[,/\s]+/u)
    .filter((part) => part !== '')
    .map(Number);
  const [r = 0, g = 0, b = 0, a = 1] = parts;
  return { rgb: [r, g, b], alpha: a };
};

const toHex = (rgb) =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

/** Composite a possibly translucent colour onto an opaque one. */
export const composite = (foreground, background) => {
  const fg = channels(foreground);
  const bg = channels(background);
  return toHex(fg.rgb.map((value, index) => value * fg.alpha + bg.rgb[index] * (1 - fg.alpha)));
};

/**
 * `resolveToken` hands back a `var(--x)` reference when a token is defined in
 * terms of another — `--scrollbar-track: var(--paper)`, `--selection-fg:
 * var(--ink)`. Follow the chain until a literal, so an indirect token is measured
 * rather than silently skipped.
 */
const literal = (value, tokens, seen = new Set()) => {
  const reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/u.exec(String(value).trim());
  if (!reference || seen.has(reference[1])) {
    return String(value).trim();
  }
  seen.add(reference[1]);
  return literal(tokens[reference[1].slice(2)] ?? value, tokens, seen);
};

const resolveThemeTokens = (css, theme) => {
  const context = themeContext(theme);
  const raw = Object.fromEntries(
    THEME_TOKENS.map((name) => [name, resolveToken(css, context, `--${name}`)]),
  );
  return Object.fromEntries(
    Object.entries(raw).map(([name, value]) => [name, literal(value, raw)]),
  );
};

/** Both themes' tokens, resolved once. The stylesheet compiles in ~1s. */
export const tokensForBothThemes = async () => {
  const css = await compileProjectStylesheet();
  return { dark: resolveThemeTokens(css, 'dark'), light: resolveThemeTokens(css, 'light') };
};

export { normalizeHex };
