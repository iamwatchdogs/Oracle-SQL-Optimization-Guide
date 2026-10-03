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
     * Scope: the global stylesheet only. expressive-code writes its own stylesheet
     * link into the markdown it renders, through its own bundler, so it never
     * passes through this setting — its `<link>` is still emitted into the body,
     * hundreds of kilobytes into the document. That is a separate defect with its
     * own fix; see the scoped tests in
     * `test/integration/render-blocking-css.test.mjs`, which pin the remainder so
     * this change cannot quietly be credited with fixing it.
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
