/*
 * Where the notebook's source lives.
 *
 * Both the header trigger and the footer colophon point here, so the remote is
 * written once. `REPO_PATH` is derived rather than restated: a repository URL and
 * the host/path string printed next to a compile date are the same fact, and two
 * literals would be free to disagree.
 *
 * `REPO_URL` is the one place the remote is written. Replace it there; the
 * derived label follows it.
 *
 * The repository is not created yet, so this link is live before its target
 * exists. That is deliberate and temporary — it is here so the chrome is final
 * and the URL becomes correct the moment the first push lands.
 */
export const REPO_URL = 'https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide';

export const REPO_PATH = REPO_URL.replace(/^https?:\/\//u, '').replace(/\/+$/u, '');

/*
 * Where the notebook is published.
 *
 * GitHub Pages mounts a repository at `https://<account>.github.io/<repo>`, so
 * the two halves of that address are different facts and Astro keeps them in
 * different fields: `site` is the origin, `base` is the repository prefix.
 * Writing the repository into `site` instead is the classic mistake and it
 * fails quietly — the build succeeds and every sitemap entry 404s
 * (withastro/astro#13315).
 */

/** The origin. No trailing slash; the repository is a path, not part of this. */
export const SITE_ORIGIN = 'https://iamwatchdogs.github.io';

/**
 * The path GitHub Pages mounts this repository at.
 *
 * This is the default, not the law. `resolveBase()` lets `SITE_BASE` override
 * it, so a future deploy target that serves from the origin root — Cloudflare
 * Pages, Netlify, a custom domain — can build these same sources with
 * `SITE_BASE=/` and no edit anywhere. Everything that needs the prefix goes
 * through that one function rather than reading this constant, because the
 * config and the markdown pipeline both have to agree on it and two copies of
 * the rule would be free to disagree.
 */
export const SITE_BASE = '/Oracle-SQL-Optimization-Guide';

/**
 * The prefix this build is being made for, as the deployment spells it.
 *
 * The trailing slash is stripped because every call site joins onto a path that
 * already begins with one: `/` + base + `/04-recipes/` has to be
 * `/Oracle-…/04-recipes/`, not `/Oracle-…//04-recipes/`. An empty or `/` base
 * normalises to an empty string, which is what "served from the root" means.
 */
export const resolveBase = () => normaliseBase(process.env['SITE_BASE'] ?? SITE_BASE);

const normaliseBase = (base) => {
  const trimmed = base.trim().replace(/\/+$/u, '');
  if (trimmed === '') {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

/** The name of the work. Also the one title `BaseLayout` renders unabbreviated. */
export const SITE_TITLE = 'Oracle SQL Optimization for Junior Devs';

/**
 * What the notebook is, for a reader who has not opened it yet.
 *
 * Every page has a `description` in frontmatter, so this is the floor rather
 * than the norm — but a page without one would otherwise ship a description to
 * humans and none to crawlers, because `og:description` shares the fallback.
 */
export const SITE_DESCRIPTION =
  'Prove every speed win twice. A short book from 68 proven Oracle fixes, tools, and safe ship habits.';

/** BCP 47 tag for `og:locale` and the manifest's `lang`. The book is English. */
export const SITE_LOCALE = 'en';

/**
 * The colour a browser paints its own chrome in: the manifest's `theme_color`,
 * the manifest's `background_color`, and `<meta name="theme-color">`.
 *
 * It is `--paper` from the dark default in `global.css`, written down here
 * because a manifest is JSON and a `<meta>` is a string literal — neither can read
 * a custom property at the point it is emitted. One constant rather than three
 * literals, and `icons.test.mjs` pins it against the stylesheet, so a theme
 * change that moves the paper colour fails one test rather than three silent
 * places.
 */
export const THEME_COLOR = '#0c0c0e';

/**
 * The day this edition of the book was compiled.
 *
 * The colophon printed this, and the appendix is explicit about why: a
 * repository's licence, last push and archive flag are properties of a moment, so
 * they are printed with the date they were read rather than as bare chrome. The
 * date belongs to the edition, not to any one chapter.
 *
 * It is written down rather than taken from the clock on purpose. A build that
 * stamped `new Date()` would produce a different answer on every run, so the same
 * input would yield a different `lastBuildDate` and a different footer — a diff
 * nobody can review. Raise it when the content actually changes.
 */
export const COMPILED_ON = '2026-09-22';

/**
 * Join a root-relative path to the configured base.
 *
 * Read from `import.meta.env.BASE_URL` rather than `SITE_BASE` on purpose: this
 * runs in every component, and only Astro knows the value the build actually
 * used — including an override that came from the environment. Reading
 * `SITE_BASE` here would quietly disagree with a `SITE_BASE=/` build.
 *
 * Idempotent: a path already carrying the base is returned unchanged, so
 * double-applying it cannot produce `/Oracle-…/Oracle-…/`.
 */
export const withBase = (path) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/u, '');
  if (base === '') {
    return path;
  }
  return path === base || path.startsWith(`${base}/`) ? path : `${base}${path}`;
};

/**
 * The inverse of `withBase`: turn a deployed pathname back into the route the
 * book is written against, so `/Oracle-…/04-recipes/` reads as `/04-recipes/`.
 *
 * Needed because the one value that decides what page you are on is not written
 * by hand. `Astro.url.pathname` already carries the prefix the build used, so
 * comparing it against a route written without one silently fails — which is
 * exactly how the section list lost its active state once `base` was set.
 */
export const withoutBase = (path) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/u, '');
  if (base === '' || !path.startsWith(base)) {
    return path;
  }
  return path.slice(base.length) || '/';
};
