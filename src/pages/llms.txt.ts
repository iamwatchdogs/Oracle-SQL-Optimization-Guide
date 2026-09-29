import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { REPO_URL, resolveBase, SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE } from '../lib/site.mjs';

/*
 * `/llms.txt` — a map of the book for a reader that is an agent.
 *
 * The spec is llmstxt.org v2: an H1, a blockquote summary, then H2 sections of
 * markdown links. A file covers the URLs under the path it sits at, and the most
 * specific one wins — which is exactly why a subpath is a valid home for it. The
 * spec's own authors name this case: a GitHub Pages project site can publish in
 * its own directory but never add a file to the host's `/.well-known/`, so a
 * filename beside `index.html` is the only location available.
 *
 * ## Why this exists at all
 *
 * An agent asked to summarise this book has two options: fetch 37 HTML pages and
 * spend its context on navigation, chrome, a table of contents and a footer that
 * all repeat, or be handed the list of what is here and what each page is for.
 * This is the second thing, and it is a list, not a copy — `llms-full.txt` is the
 * copy, and it is a separate file on purpose. A concatenated corpus that does not
 * fit is worse than none: an agent silently truncates it and answers from a
 * fraction of the book.
 *
 * ## What is deliberately absent
 *
 * No "here is why you should read my site" framing. An agent choosing where to
 * look cannot be persuaded by self-description, and a file that argues for itself
 * is a file an agent has to learn to discount.
 */
/**
 * The book as an index: the home page, then each section with its chapters.
 *
 * Returned as data rather than lines so the shape of the book is one function's
 * job and its rendering is another's. A single function doing both is where the
 * id-shape rules end up tangled.
 */
const buildIndex = async (): Promise<Group[]> => {
  const sections = await getCollection('notebook', ({ data }) => !data.draft);

  /*
   * Grouped by directory rather than listed flat, because the book's structure is
   * the useful part: a reader who wants the measurement material should not have
   * to read all 37 descriptions to find out which four pages it is.
   */
  const groups = new Map<string, Group>();

  for (const entry of sections) {
    /*
     * The glob loader drops a trailing `index` from the id, so a section index is
     * just its directory — `00-preface`, not `00-preface/index` — and the book's
     * own home page is the single id `index`. That gives two shapes to tell apart:
     * a one-segment id is either a section index or the home page.
     */
    const isHome = entry.id === 'index';
    const key = isHome ? '' : (entry.id.split('/')[0] ?? entry.id);
    /* The id is the route for everything except the home page. The group heading
     * says which section a chapter belongs to, but the link still has to be
     * complete — an agent follows the URL, not the heading above it. */
    const route = isHome ? '' : entry.id;

    const group = groups.get(key) ?? { key, title: '', pages: [] };
    group.pages.push({ title: entry.data.title, description: entry.data.description, route });
    groups.set(key, group);
  }

  /*
   * A section's heading is the title on its own index page — read from the corpus
   * rather than written here, because a table written here would be a third copy
   * of the section names, free to fall behind the two that already render on the
   * page.
   */
  for (const group of groups.values()) {
    group.title =
      group.key === ''
        ? ''
        : (sections.find((entry) => entry.id === group.key)?.data.title ?? group.key);
  }

  /*
   * The home page leads, then the sections in reading order. The corpus is
   * glob-ordered, so a section index is seen before its own chapters and each
   * group is already contiguous; rebuilding the order here would be a third
   * place that has to agree with the collection.
   */
  return [...groups.values()].toSorted(readingOrder);
};

/**
 * One chapter, or the ungrouped run the home page belongs to.
 *
 * `description` is optional because the frontmatter schema makes it so, and it is
 * declared as possibly-`undefined` rather than merely optional: with
 * `exactOptionalPropertyTypes`, a `description?: string` would refuse the
 * assignment below, and the honest type is the one that says a page may have
 * none.
 */
type Page = { title: string; description: string | undefined; route: string };

/** A section, keyed by the directory it is grouped under. */
type Group = { key: string; title: string; pages: Page[] };
/**
 * An absolute URL for a route, as the deployed site serves it.
 *
 * The route is joined without a leading slash on purpose. `new URL` resolves a
 * rooted path against the origin, which would throw away the prefix — the same
 * trap as `page.goto('/x/')` under a `baseURL` that has a path, and it fails the
 * same way: a build that succeeds and links to nowhere.
 */
const url = (route: string): string => new URL(route, `${SITE_ORIGIN}${resolveBase()}/`).href;

/** The home page first, then the sections in reading order. */
const readingOrder = (a: Group, b: Group): number =>
  a.key === '' ? -1 : b.key === '' ? 1 : a.key.localeCompare(b.key);

export const GET: APIRoute = async () =>
  new Response(renderIndex(await buildIndex()), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });

const renderIndex = (groups: Group[]): string => {
  const lines: string[] = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'A static book about proving Oracle SQL performance wins. Every technique is',
    'graded by the strength of its evidence, and the grading scheme is the first',
    'page. Prose on this site is written for people; this file is the index, and',
    'each entry says what the page is for so an agent can pick before it reads.',
    '',
    'The book is one argument in eight parts, meant to be read in order. Chapters',
    'are titled for what they establish, not for what they contain.',
    '',
  ];

  for (const group of groups) {
    if (group.key !== '') {
      lines.push(`## ${group.title}`, '');
    }
    for (const page of group.pages) {
      const link = `[${page.title}](${url(page.route === '' ? '' : `${page.route}/`)})`;
      lines.push(page.description ? `- ${link}: ${page.description}` : `- ${link}`);
    }
    lines.push('');
  }

  /*
   * A note on where the text actually is. The pages are HTML; this file points at
   * them as links rather than inlining them, so an agent that wants the prose
   * fetches exactly one page and gets one page.
   */
  lines.push(
    '## About this file',
    '',
    `- [Sitemap](${url('sitemap-index.xml')}): every page on the site, in one XML index`,
    `- [Source](${REPO_URL}): the markdown this site is built from, one file per page`,
    '',
  );

  return lines.join('\n');
};
