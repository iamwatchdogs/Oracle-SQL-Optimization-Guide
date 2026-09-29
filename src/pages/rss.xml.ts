import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  COMPILED_ON,
  resolveBase,
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  SITE_TITLE,
} from '../lib/site.mjs';

/**
 * The book's feed.
 *
 * ## Why every item carries the same date
 *
 * The corpus records no per-chapter dates, and inventing them would be a lie a
 * reader cannot see: a feed is the one place a date is a promise. So every item
 * carries the edition's compile date, which is true of all of them — they were
 * compiled together, and the colophon already prints it.
 *
 * `entry.data.date` is the way out. A chapter that is genuinely revised adds one
 * to its frontmatter and the schema starts accepting it; until then the field
 * does not exist, because an unused schema field is a promise nothing keeps.
 * Revised chapters are ordered by `order` and not by date, so a revision shows up
 * as a new `pubDate` on an item a reader already has rather than as a reordered
 * feed. A book is read in order; a feed that reshuffles is harder to follow.
 *
 * ## What a feed is for here
 *
 * A reader who wants to know a chapter changed. This book is not a blog and the
 * feed is not a subscription list — it is a way to be told about a revision, and
 * nothing about it invites anyone to follow along.
 */

/** The one date a reader can be given without the corpus inventing one. */
const edition = new Date(`${COMPILED_ON}T00:00:00Z`);

export const GET: APIRoute = async (context) => {
  const base = resolveBase();
  const origin = context.site ?? new URL(SITE_ORIGIN);
  /* Joined, not concatenated: `Astro.site` is the origin and the repository is a
     path under it, and a channel whose `<link>` points at the origin root tells a
     reader the feed is about a site that has nothing on it. */
  const siteRoot = new URL(`${base}/`, origin).href;
  const url = (route: string) => new URL(route, siteRoot).href;

  const documents = await getCollection('notebook', ({ data }) => !data.draft);

  /*
   * In the order the book is meant to be read, which is the collection's own
   * `order` and not the filesystem order. A feed that arrived in directory order
   * would put the appendix before the preface.
   */
  const ordered = documents.toSorted((a, b) => (a.data.order ?? 9999) - (b.data.order ?? 9999));

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: siteRoot,
    trailingSlash: true,
    items: ordered.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description ?? SITE_DESCRIPTION,
      pubDate: edition,
      link: entry.id === 'index' ? siteRoot : url(`${entry.id}/`),
      /* The section a chapter belongs to, or 'overview' for the book's own
       * pages — a category that groups them in a reader. */
      categories: [entry.id.includes('/') ? (entry.id.split('/')[0] ?? 'overview') : 'overview'],
    })),
    customData: `<language>en</language><lastBuildDate>${edition.toUTCString()}</lastBuildDate>`,
  });
};
