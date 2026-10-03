import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCodePlugin from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import { markdownProcessor } from './src/lib/markdown-processor.mjs';
import { resolveBase, SITE_ORIGIN } from './src/lib/site.mjs';

// https://astro.build/config
export default defineConfig({
  /*
   * Published at https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/.
   *
   * `site` is the origin and the repository is a path prefix, never a single
   * URL: putting the repository in `site` builds cleanly and then emits a
   * sitemap of URLs that all 404 (withastro/astro#13315).
   */
  site: SITE_ORIGIN,
  /*
   * The repository prefix. GitHub Pages mounts the project site here, and Astro
   * prefixes the assets it generates but not the links a document writes — those
   * are handled by `rehypeBaseLinks` in the markdown pipeline.
   *
   * `SITE_BASE=/` builds these same sources for a target that serves from the
   * root, so moving off GitHub Pages is an environment variable and not an edit.
   */
  base: resolveBase(),
  output: 'static',
  trailingSlash: 'always',
  // A linear book: every pager cell and nav link is a likely next read.
  // Prefetch once a link scrolls into view, not only on hover.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: {
    plugins: [tailwindcss()],
    build: {
      /*
       * An ASSET inlining limit, and nothing to do with stylesheets.
       *
       * This number decides whether a font or a small image becomes a `data:` URI
       * rather than a second request. It has no bearing on whether a stylesheet is
       * inlined into a page — that is decided by `build.inlineStylesheets` below,
       * which reads ASTRO's `build.assetsInlineLimit`, not this one. The two
       * settings have almost the same name and one of them was read as the other
       * while the critical CSS was being diagnosed, so it is worth saying which is
       * which: if the global stylesheet ever fails to inline again, this line is
       * not why, and changing it will not fix it.
       *
       * 4096 is Vite's default and is right here. The four faces this book loads
       * are 12-30 KB each and are preloaded from the head, so inlining them would
       * add roughly 80 KB to every page to save a request the preload already
       * makes cheap.
       */
      assetsInlineLimit: 4096,
      cssMinify: true,
    },
    css: {
      transformer: 'lightningcss',
      lightningcss: { minify: true },
    },
  },
  build: {
    /*
     * Inline every stylesheet this build emits. Changed from 'auto'.
     *
     * 'auto' inlines a stylesheet only when it is under `build.assetsInlineLimit`,
     * which is Astro's own option and defaults to 4096 bytes. The global sheet
     * compiles to about 63 KB — fifteen times that — so 'auto' left it external,
     * in `<head>`, on all thirty-eight pages, and it became the single largest
     * first-paint blocker on the site: 306 ms of render-blocking time on a
     * Lighthouse mobile run.
     *
     * The reason this was once 'auto' was cacheability, and the reason it no longer
     * is: a large sheet stays external so that a repeat visit fetches it once.
     * This is a book whose pages are read ONCE each. A reader arrives on one
     * chapter from a search result or a link, reads it, and leaves. There is no
     * second visit for the cache to serve, so the argument does not apply to any
     * page on the site — while the cost, one render-blocking request on the one
     * page being read, applies to all of them. Inlining trades a repeat-visit
     * saving nobody collects for a cold-load saving everybody pays.
     *
     * 'always' rather than a raised limit, and the difference matters for the next
     * person. A number big enough to cover the global sheet would be a magic
     * constant tracking the size of a CSS file that changes every time a chapter
     * grows; it goes stale silently and the regression returns with no signal. The
     * intent here is not "inline sheets under N bytes", it is "this book ships its
     * CSS with its pages", and 'always' is the setting that says so.
     *
     * The cost, stated plainly because it is real: every page now carries about
     * 63 KB more markup. Gzipped that is roughly 12 KB per page — about what the
     * stylesheet request cost to transfer anyway — and it arrives inside a response
     * the browser is already fetching rather than in a request it must wait for.
     *
     * Scope: the global stylesheet. expressive-code writes its own stylesheet link into
     * the markdown it renders, through its own bundler, so it never passes through this
     * setting — see `emitExternalStylesheet` in `integrations` below, which is where that
     * sheet is dealt with. Nothing here moves it and nothing here should: an inline
     * `<style>` in the body is a page-level decision, and the two settings have no
     * interaction beyond both ending up as `<style>` elements on the same page.
     */
    inlineStylesheets: 'always',
  },
  fonts: [
    {
      name: 'Source Serif 4',
      cssVariable: '--face-serif',
      provider: fontProviders.google(),
      weights: ['400', '600', '700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Inter',
      cssVariable: '--face-sans',
      provider: fontProviders.google(),
      weights: ['400', '500', '600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--face-mono',
      provider: fontProviders.google(),
      weights: ['400', '500', '600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  integrations: [
    // Expressive Code must come before mdx() to own code-block rendering.
    // It automatically disables Astro's built-in Shiki highlighting.
    // github-dark works in both modes: code blocks stay dark on light pages.
    astroExpressiveCodePlugin({
      /*
       * Inline expressive-code's stylesheet instead of linking it. Changed from the
       * default, `true`.
       *
       * WHAT WAS WRONG, and it is a different defect from the one `inlineStylesheets`
       * above addressed, which is why it needed its own option. expressive-code does not
       * hand Astro a stylesheet to bundle. Its rehype hook writes a finished `<link
       * rel="stylesheet">` tag into the markdown AST — `renderData.groupAst.children
       * .unshift(...extraElements)` at
       * `node_modules/astro-expressive-code/dist/index.js:135-166` — and Astro serialises
       * the content AST wherever the layout puts it. So the tag landed inside `<body>`, at
       * the position of the first code block, and nothing in Astro's pipeline could move
       * it: by the time Astro looks, the decision has been made and there is only a string
       * of HTML to print. Measured on `/00-preface/01-why-evidence-grades/` before this
       * change: the tag sat at offset 137,618 of a 170,536-byte document, 80.7% of the
       * way in. Thirty-four of the thirty-eight built pages had one; a parser had to
       * consume two thirds of the page before it found a render-blocking stylesheet, then
       * pay a second round-trip for 15,817 bytes raw / 3,823 gzip.
       *
       * `false` takes the branch already in the package for exactly this case
       * (`dist/index.js:186-191`), which writes the identical CSS into a `<style>` element
       * in the same AST slot (`dist/index.js:148-155`). The ruleset is byte-for-byte the
       * one that was being fetched — verified against the old `ec.b93kz.css`, 15,817
       * bytes, an exact match — and the rendered code blocks are byte-for-byte the same
       * markup with the link tag removed. This is a change of delivery and nothing else.
       *
       * It also stays conditional per page, which is the second reason to prefer it to any
       * arrangement that injects the sheet from a layout. The hook is guarded by
       * `isFirstGroupInDocument` (`dist/index.js:136`), so a page with no code block never
       * runs it and never carries a byte of these rules. Inlining a stylesheet into a
       * `<head>` in `BaseLayout.astro` would have put 15.8 KB of markup on the home page
       * and the 404, neither of which can ever select a `.expressive-code` rule.
       *
       * WHAT THIS DOES NOT DO, stated here because the temptation is to read the change as
       * more than it is. The `<style>` is in the body, at the first code block — 73.9% of
       * the document on that page, after the `<h1>` and the opening paragraphs. It is not
       * in `<head>`. What is gone is the render-blocking request and the round-trip; what
       * remains is the distance the parser walks before it has the rules. Before this
       * line existed, that distance cost a reader a blocking fetch; now it costs a restyle
       * of one element.
       *
       * So: three ways to get the sheet into `<head>`, and why none of them is here.
       *
       *   - A rehype plugin in `src/lib/markdown-processor.mjs`, moving the node. It cannot
       *     see the node: expressive-code PUSHES ITSELF onto the end of the rehype array
       *     the config already built (`dist/index.js:512`), so every plugin declared in
       *     `markdown-processor.mjs` has already run by the time the `<style>` exists. And
       *     it would achieve nothing a reader could see — the prose above the first code
       *     block is styled entirely by the global sheet in the head, so hoisting the
       *     code-block sheet above the heading changes no paint and costs a plugin.
       *   - Astro's `head` config option, which is how a raw tag used to reach every page.
       *     Removed; `node_modules/astro/dist/types/public/config.d.ts` has no `head`.
       *   - Astro's propagated-assets channel, which is the real mechanism
       *     (`content/vite-plugin-content-assets.js` builds a `__astroPropagation` module
       *     and `content/runtime.js:445-530` renders its collected styles through
       *     `createHeadAndContent`, i.e. into the head). It is driven by the content
       *     entry's MODULE GRAPH — it crawls what the compiled markdown IMPORTS
       *     (`vite-plugin-content-assets.js:124-165`). expressive-code injects raw hast,
       *     so the compiled entry imports nothing and there is nothing to crawl. Getting
       *     the CSS into that graph means bypassing Astro's public option and hand-building
       *     the renderer through `customCreateAstroRenderer`, re-implementing the package's
       *     own hook to learn a string the public API deliberately does not return — and the
       *     result would land in `<head>` on all thirty-eight pages, four of which have no
       *     code block.
       *
       * The residual is pinned rather than forgotten: `code-block-css.test.mjs` has a test
       * named "the code-block sheet is a body element, and this test says so out loud",
       * which fails if the sheet ever moves into the head. When that happens, delete the
       * test and this paragraph — not before.
       */
      emitExternalStylesheet: false,
      themes: ['github-dark'],
      defaultProps: { wrap: true },
      // Flat by contract: the frames plugin ships a drop shadow on `.frame`
      // by default. Suppress it at the source instead of overriding it in
      // CSS, so no authored box-shadow exists in either theme.
      styleOverrides: {
        frames: {
          frameBoxShadowCssValue: 'none',
        },
      },
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    // Astro 7 defaults to the Satteri (Rust) processor, which silently
    // ignores remark/rehype plugins. Pin the unified pipeline so the
    // remark/rehype plugins in `markdownProcessor` actually run.
    // remarkMeasuredValues: force annotation — wraps E-Rows/A-Rows/elapsed
    // tokens in .measured spans (presentation only; wording unchanged).
    processor: markdownProcessor,
  },
});
