import type { APIRoute } from 'astro';
import { resolveBase, SITE_DESCRIPTION, SITE_LOCALE, SITE_TITLE } from '../lib/site.mjs';

/**
 * The web app manifest.
 *
 * A book does not need to be installable, so the honest question is what this
 * buys. Three things, all narrow:
 *
 *  - `theme_color` and `background_color` let a browser paint the address bar and
 *    the splash area of an added-to-homescreen shortcut in the book's own dark
 *    paper rather than white, which on this design is the difference between a
 *    shortcut that looks like the book and one that looks broken.
 *  - The icon set is what a home screen uses, and those icons have to be
 *    reachable at real sizes. The single inline data-URI favicon cannot be: an
 *    emoji at 192px is a 1-bit glyph scaled up.
 *  - `id` and `start_url` scoped to the site root, so a shortcut opens the book
 *    rather than a path that only existed when the shortcut was made.
 *
 * It is a route rather than a file in `public/` for the reason robots.txt is: the
 * colours come from the same tokens the rest of the design does, and a hand-kept
 * copy of a hex value is a copy that will be wrong.
 */
export const GET: APIRoute = () => {
  const base = resolveBase();
  const icon = (name: string) => `${base}/${name}`;

  return new Response(
    JSON.stringify(
      {
        lang: SITE_LOCALE,
        dir: 'ltr',
        name: SITE_TITLE,
        short_name: 'Oracle SQL',
        description: SITE_DESCRIPTION,
        /* Scoped and started at the book, not at whatever page a reader happened
           to be on. A shortcut that reopens last week's chapter is a shortcut
           that looks like it is broken. */
        id: `${base}/`,
        start_url: `${base}/`,
        scope: `${base}/`,
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0c0c0e',
        background_color: '#0c0c0e',
        categories: ['education', 'books', 'developer'],
        icons: [
          { src: icon('favicon-16x16.png'), sizes: '16x16', type: 'image/png' },
          { src: icon('favicon-32x32.png'), sizes: '32x32', type: 'image/png' },
          { src: icon('apple-touch-icon.png'), sizes: '180x180', type: 'image/png' },
          { src: icon('icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: icon('icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } },
  );
};
