/*
 * The font assets a production build emits, read from `dist/`.
 *
 * Sits beside `built-site.mjs` rather than inside a test for the reason that module's header gives in
 * general: `dist/` says a font was emitted, and these say what the document says about it, and a test that
 * had to re-derive "a `@font-face` rule" from a regex to make its point would have started making a second,
 * slightly different, regex.
 *
 * The cascade half — which face a given element paints in — is `test/support/css/font-faces.mjs`, because
 * that is a question about selectors and specificity rather than about what the build wrote.
 */
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { distRoot, hrefOf, inlineStyleBlocks, walk } from './built-site.mjs';

/** Where the font provider's output lands, which is a build-output path and so is `built-site`'s to say. */
const FONT_DIRECTORY = path.join(distRoot, '_astro', 'fonts');

/** Every self-hosted font file the build emitted, keyed by file name, valued by size in bytes.
 *
 *  Sized, not just listed, because the question these answer is "how much is the parser putting on the
 *  critical path", and a list of file names cannot be weighed. Keyed by file name for the reason
 *  `loadEmittedStylesheets` is: asset URLs carry the deployment base, so a `SITE_BASE=/` build would miss
 *  every lookup. An absent directory yields an empty map rather than throwing, so the caller can assert
 *  `size > 0` with a message that names what was missing.
 */
export const loadEmittedFonts = async () => {
  const files = await walk(FONT_DIRECTORY).catch(() => []);
  const selfHosted = files.filter((file) => file.endsWith('.woff2'));
  return new Map(
    await Promise.all(selfHosted.map(async (f) => [path.basename(f), (await stat(f)).size])),
  );
};

/** Whole `<link>` tags that preload a font, wherever in the document they sit.
 *
 *  Scoped to `as="font"` so it cannot pick up a preload of something else, and to whole tags so a `rel`
 *  inside prose cannot match. Deliberately NOT head-only: a test may want to prove nothing ANYWHERE
 *  preloads a font, and a helper that silently filtered to the head could not tell them the difference.
 */
export const fontPreloadLinks = (html) =>
  [...html.matchAll(/<link\b[^>]*>/gu)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel="preload"/u.test(tag) && /\bas="font"/u.test(tag));

/** The value of one declaration inside an `@font-face` body, or `null` when absent. */
const faceValue = (body, property) =>
  new RegExp(`(?:^|;)\\s*${property}\\s*:([^;}]*)`, 'u').exec(body)?.[1] ?? null;

/** One CSS family name out of a value, unquoted.
 *
 *  lightningcss quotes a family only when it has to: `"Source Serif 4-2241a5b85ee54f8f"` has spaces and is
 *  quoted, `Inter-86155b4f3141ff2c` is one valid identifier and is not. A reader that assumed quotes
 *  resolves two of the four faces to an empty string and quietly proves nothing about them.
 */
const unquote = (value) => (value ?? '').trim().replaceAll(/^["']|["']$/gu, '');

/**
 * The `@font-face` rules a page declares, as `{ family, style, weight, display, src }`.
 *
 * `src` is the URL inside `url(...)`, or `''` for Astro's metric-adjusted LOCAL fallbacks —
 * `src: local("Times New Roman")` with `size-adjust` and `ascent-override` — which name no file and so never
 * produce a request. They are kept rather than filtered: a reader that dropped them would see twelve rules
 * for four files and have no way to tell which kind it was looking at.
 *
 * Reads the page's own INLINED sheets, because that is where a browser gets them: `<Font>` emits the
 * `@font-face` block as a `<style>` (`node_modules/astro/components/Font.astro:26`) and
 * `inlineStylesheets: 'always'` inlines it.
 */
export const fontFaceRules = (html) =>
  inlineStyleBlocks(html).flatMap((block) =>
    [...block.body.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map(([, body]) => ({
      family: unquote(faceValue(body, 'font-family')),
      style: (faceValue(body, 'font-style') ?? 'normal').trim(),
      weight: (faceValue(body, 'font-weight') ?? '').trim(),
      display: (faceValue(body, 'font-display') ?? '').trim(),
      src: /url\(\s*"([^"]*)"\s*\)/u.exec(body)?.[1] ?? '',
    })),
  );

/** Every stylesheet a page applies, as one string — which is what a browser cascades. */
export const pageCss = (html) =>
  inlineStyleBlocks(html)
    .map((block) => block.body)
    .join('\n');

/** The font files a page preloads, as a `Set` of file names. */
export const facePreloadFiles = (html) =>
  new Set(fontPreloadLinks(html).map((tag) => path.posix.basename(hrefOf(tag))));
