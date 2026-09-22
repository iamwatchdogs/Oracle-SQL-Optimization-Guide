import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import astroExpressiveCodePlugin from 'astro-expressive-code';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
  // Replace with the real production URL so sitemap.xml and canonical URLs are correct.
  site: 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    // Mermaid first: registers its markdown transform before the other
    // markdown-processing integrations (see astro-mermaid README).
    // Dark-only guidebook: render diagrams with the dark theme at build
    // time instead of following the OS color scheme.
    mermaid({ theme: 'dark', autoTheme: false }),
    // Expressive Code must come before mdx() to own code-block rendering.
    // It automatically disables Astro's built-in Shiki highlighting.
    // Dark-only guidebook: a single dark theme, applied unconditionally.
    astroExpressiveCodePlugin({
      themes: ['github-dark'],
      defaultProps: { wrap: true },
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    // Astro 7 defaults to the Satteri (Rust) processor, which silently
    // ignores remark/rehype plugins. Pin the unified pipeline so
    // remark-math + rehype-mathjax actually run for .md and .mdx.
    // rehype-mathjax default renders SVG at build time: no client JS,
    // no extra CSS, works offline.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeMathjax],
    }),
  },
});
