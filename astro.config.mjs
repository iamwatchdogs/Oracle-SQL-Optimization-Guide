import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import astroExpressiveCodePlugin from 'astro-expressive-code';
import mermaid from 'astro-mermaid';
import tailwindcss from '@tailwindcss/vite';
import { remarkMeasuredValues } from './src/lib/remark-measured.mjs';

// https://astro.build/config
export default defineConfig({
  // Replace with the real production URL so sitemap.xml and canonical URLs are correct.
  site: 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: 'Source Serif 4',
      cssVariable: '--font-serif',
      provider: fontProviders.google(),
      weights: ['400', '600', '700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Inter',
      cssVariable: '--font-sans',
      provider: fontProviders.google(),
      weights: ['400', '500', '600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.google(),
      weights: ['400', '500', '600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  integrations: [
    // Mermaid first: registers its markdown transform before the other
    // markdown-processing integrations (see astro-mermaid README).
    // Diagrams render dark by default; light mode flips them via CSS filter.
    mermaid({ theme: 'dark', autoTheme: false }),
    // Expressive Code must come before mdx() to own code-block rendering.
    // It automatically disables Astro's built-in Shiki highlighting.
    // github-dark works in both modes: code blocks stay dark on light pages.
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
    // remarkMeasuredValues: force annotation — wraps E-Rows/A-Rows/elapsed
    // tokens in .measured spans (presentation only; wording unchanged).
    processor: unified({
      remarkPlugins: [remarkMath, remarkMeasuredValues],
      rehypePlugins: [rehypeMathjax],
    }),
  },
});
