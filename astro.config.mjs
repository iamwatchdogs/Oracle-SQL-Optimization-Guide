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
  vite: {
    plugins: [tailwindcss()],
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
