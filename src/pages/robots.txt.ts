import type { APIRoute } from 'astro';
import { resolveBase, SITE_ORIGIN } from '../lib/site.mjs';

/*
 * robots.txt, generated rather than written.
 *
 * It used to be a static file in `public/`, and it named the wrong host: the
 * `Sitemap:` line still pointed at `example.com` after the site had been given a
 * real address, because nothing rewrites a file that is merely copied. Deriving
 * it here means the two can never disagree again — there is one place the address
 * is written and this reads it.
 *
 * ## Why it says what it says
 *
 * `Allow: /` with no `Disallow` is the whole story for a book that wants to be
 * found. There is nothing private here and nothing to hide behind a crawl delay,
 * which is a directive that harms readers and does not meaningfully reduce crawl
 * load.
 *
 * ## What a reader should know about this file
 *
 * On a GitHub Pages *project* site the notebook is served from a subdirectory, so
 * this file is fetched at `/<repo>/robots.txt` rather than at the origin root.
 * RFC 9309 requires the top-level path, and crawlers do not look in
 * subdirectories. A crawler reaching this one will read it; a crawler looking for
 * it at the root will not find it. That is a property of hosting on the default
 * `github.io` domain, not something this file can fix — the only way to have a
 * robots.txt honoured is to serve the site from the origin root, which is a
 * decision about hosting rather than about this file.
 *
 * Sitemap discovery therefore does not lean on this file alone. The sitemap is
 * also declared with `<link rel="sitemap">` in every page head, and can be
 * submitted directly to a search console.
 */
export const GET: APIRoute = () => {
  const base = resolveBase();
  const origin = SITE_ORIGIN + base;
  const sitemap = new URL('sitemap-index.xml', `${origin}/`).href;

  return new Response(
    [
      '# The Oracle SQL optimization notebook. A static book: nothing here is',
      '# private, and nothing is gated, so everything is allowed.',
      '',
      'User-agent: *',
      'Allow: /',
      '',
      '# The sitemap is a single index that references the numbered parts.',
      `Sitemap: ${sitemap}`,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
};
