/*
 * The production build, read from disk.
 *
 * Almost every integration test in this repo reads a source file rather than
 * `dist/`, and says why in its own header: `verify` runs the unit suite BEFORE
 * `astro build`, so a test reading `dist/` here would check whatever the last
 * build happened to leave behind. That rule is right for nearly everything those
 * tests check. It is wrong for exactly one thing, which is why this module exists.
 *
 * The shape of the critical CSS is not a property of any source file.
 * `src/styles/global.css` is byte-for-byte the same whether the bundler ships it
 * as an external `<link>` that blocks first paint or as an inline `<style>` that
 * does not — the difference lives in `astro.config.mjs` and in what comes out of
 * the bundler, and neither is visible from a source file. So this goes and gets
 * the real thing.
 *
 * It builds when there is nothing to read, and rebuilds when what is on disk
 * predates the files that decide the critical-CSS shape. Both halves are load-
 * bearing and they fail in opposite directions:
 *
 *   - Without the build, a clean checkout has no `dist/`, every assertion would
 *     quietly pass over an empty list, and the invariant would be checked by
 *     nobody. That is the failure this repo cares about most: a check that goes
 *     silent in exactly the configuration the README documents.
 *   - Without the freshness check, editing `astro.config.mjs` and running
 *     `bun run test` without rebuilding asserts against the PREVIOUS build — so
 *     the regression this exists to catch reports green, and the stale-`dist/`
 *     trap the repo's own comments warn about becomes the mechanism of the test.
 *
 * `astro build` is about four seconds for this book, so an honest read is cheaper
 * than the time spent doubting whether the read was honest.
 *
 * `built-links.spec.mjs` has its own equivalent walk inline. It is left alone
 * deliberately: this commit is about one stylesheet, and rewriting an unrelated
 * spec's helpers would put a second concern in the diff. Folding that walk in
 * here is the obvious follow-up once a third reader needs it.
 *
 * ── LATER ──
 *
 * The freshness rule above is necessary and it is not sufficient, and the gap opened
 * when expressive-code's stylesheet came into scope: `astro build` caches the RENDERED
 * MARKDOWN of every content entry in `node_modules/.astro/data-store.json`, keyed on the
 * CONTENT FILE'S BYTES alone. `content/loaders/glob.js:91` digests `contents` and nothing
 * else; `content/mutable-data-store.js:334-337` skips re-ingesting a matching entry, so
 * `entry.rendered.html` survives; and the one change that WOULD invalidate it is
 * excluded — `content-layer.js:178-194` hashes the Astro config for its own cache key
 * with `vite`, `integrations` and `adapter` destructured away.
 *
 * So flipping an option ON `astroExpressiveCodePlugin({...})` re-runs the build, re-emits
 * `_astro/ec.*.css`, and then serves last time's markdown. Measured, not hypothesised:
 * with the option flipped back and nothing deleted, the build wrote a stylesheet no page
 * linked while every page still carried the previous configuration's inlined sheet. Both
 * halves applied, in different builds — a test reading that build cannot tell a working
 * fix from a broken one.
 *
 * Hence two changes below, both failing towards reporting a change that was never made:
 * `src/lib/**\/*.mjs` joins `BUILD_INPUTS`, because the markdown pipeline is assembled out
 * of remark and rehype plugins that reshape the built HTML as surely as a config edit; and
 * a rebuild DELETES the data store first, since it is a cache inside `node_modules/`,
 * costs about two seconds to refill, and not deleting it makes "rebuilt from the current
 * sources" a false claim about the markdown. Deleting a cache rather than trusting a
 * timestamp is the whole disagreement with the rule above: an mtime comparison can be
 * fooled by a cache whose key omits the thing that changed, and this one demonstrably is.
 */
import { execFile } from 'node:child_process';
import { readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { withBuildLock } from './build-lock.mjs';

const run = promisify(execFile);

const repoRoot = new URL('../../', import.meta.url).pathname;

export const distRoot = path.join(repoRoot, 'dist');

/**
 * Astro writes this on every build, and it is the first page emitted — so its
 * mtime is the build's own timestamp rather than the mtime of some file the
 * build happened to rewrite last.
 */
const BUILD_STAMP = path.join(distRoot, 'index.html');

/**
 * The files whose contents decide what the critical CSS looks like.
 *
 * `astro.config.mjs` chooses between an inline `<style>` and an external
 * `<link>`; `src/styles/global.css` is where every selector asserted against the
 * build is authored. A build older than either of them is describing a state
 * this repository is no longer in.
 *
 * `src/lib` is here for the reason in the header: a rehype plugin rewrites the
 * built HTML, so `markdown-processor.mjs` and the plugins it assembles decide the
 * shape of the document as much as the config does. Discovered by walking rather
 * than listed by hand, because a hand-written list is a list that goes stale the
 * day a plugin is added — and a stale list fails open, which is the direction this
 * module exists to prevent.
 */
const STATIC_BUILD_INPUTS = [
  path.join(repoRoot, 'astro.config.mjs'),
  path.join(repoRoot, 'src/styles/global.css'),
];

const buildInputs = async () => [
  ...STATIC_BUILD_INPUTS,
  ...(await walk(path.join(repoRoot, 'src', 'lib'))).filter((file) => file.endsWith('.mjs')),
];

/**
 * Astro's rendered-markdown cache, deleted rather than trusted.
 *
 * See the header for the three places in Astro that make it stale-proof against a change
 * it cannot see. `force: true` is what makes this a no-op on a clean checkout, where the
 * file does not exist yet — so the common path pays nothing for the honesty.
 */
const CONTENT_DATA_STORE = path.join(repoRoot, 'node_modules', '.astro', 'data-store.json');

const newestMtime = async (targets) => {
  const times = await Promise.all(
    targets.map((target) =>
      stat(target).then(
        (stats) => stats.mtimeMs,
        () => -1,
      ),
    ),
  );
  return Math.max(...times);
};

/** Is the build on disk at least as new as everything that shaped it? */
export const buildIsCurrent = async () => {
  const [built, inputs] = await Promise.all([
    newestMtime([BUILD_STAMP]),
    newestMtime(await buildInputs()),
  ]);
  return built >= 0 && built >= inputs;
};

/**
 * Return a `dist/` that reflects the current sources, building if it does not.
 *
 * Resolves to a sentence naming which of the two happened, so a test can put it
 * in its own failure message: "this passed against a build" and "this passed
 * against the sources" are different claims, and a reader of a red test should
 * not have to guess which one they are looking at.
 *
 * The freshness check is INSIDE the lock and repeated after it is taken. Two test
 * files that both find `dist/` stale would otherwise both decide to build; taking
 * the lock first and asking again means the second one waits, then finds the first
 * one's build and reuses it — which is both cheaper and the only version of the
 * answer that is true.
 */
export const ensureBuild = async () => {
  if (await buildIsCurrent()) {
    return 'reused the build already in dist/';
  }

  return withBuildLock(async () => {
    if (await buildIsCurrent()) {
      return 'waited for another test file to build, then reused its dist/';
    }

    try {
      await rm(CONTENT_DATA_STORE, { force: true });
      await run('bun', ['run', 'build'], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
    } catch (failure) {
      /*
       * `execFile`'s rejection carries the streams but no useful message, and a
       * build that fails here fails for the same reason it would fail in
       * `bun run build` — so the output is the whole diagnosis and it must survive
       * into the test failure rather than arriving as a bare "Command failed".
       * `cause` keeps the original attached so the stack is not lost.
       */
      throw new Error(
        `astro build failed while preparing the built site.\n${failure.stderr ?? ''}`,
        {
          cause: failure,
        },
      );
    }

    return 'built dist/ from the current sources, after emptying Astro’s rendered-markdown cache';
  });
};

export const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return nested.flat();
};

/**
 * Every built page, as `{ file, html }`, sorted so a failure lists its offenders
 * in a stable order.
 *
 * `file` is repo-relative to `dist/` with a leading slash, which is the form the
 * book writes its own routes in — so a failure message names the route a reader
 * would type rather than a filesystem path they would never see.
 */
export const loadBuiltPages = async () => {
  const files = (await walk(distRoot)).filter((file) => file.endsWith('.html')).toSorted();
  return Promise.all(
    files.map(async (file) => ({
      file: `/${file.slice(distRoot.length + 1).replace(/index\.html$/u, '')}`,
      html: await readFile(file, 'utf8'),
    })),
  );
};

/**
 * Every stylesheet the build emitted as a FILE, keyed by file name.
 *
 * Text, not path: the question this answers is "is this ruleset the global sheet",
 * which is a question about contents. Keyed by file name rather than by URL because
 * asset URLs carry the deployment base — `SITE_BASE` can move it, and keying on the
 * whole URL would make every lookup miss in a `SITE_BASE=/` build.
 */
export const loadEmittedStylesheets = async () => {
  const files = (await walk(distRoot)).filter((file) => file.endsWith('.css'));
  const sheets = await Promise.all(
    files.map(async (file) => [path.basename(file), await readFile(file, 'utf8')]),
  );
  return new Map(sheets);
};

/*
 * Reading a built page's stylesheets.
 *
 * These live beside the build reader rather than in the test that uses them, because
 * they are the second half of the same job: `dist/` says a sheet was emitted, and
 * these say where the document references it. A test that has to re-derive "a
 * `<link>` tag" from a regex to make its point has stopped making the point and
 * started making a second, slightly different, regex.
 */

/** Whole `<link>` tags only, so a `rel` inside prose or a code sample cannot match. */
export const stylesheetLinks = (html) =>
  [...html.matchAll(/<link\b[^>]*>/gu)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel="stylesheet"/u.test(tag));

/** Every `<style>` element as `{ at, body }`, where `at` is its offset in the document. */
export const inlineStyleBlocks = (html) => {
  const openings = [...html.matchAll(/<style\b[^>]*>/gu)];
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)].map(([, body], index) => ({
    at: openings[index].index,
    body,
  }));
};

export const hrefOf = (tag) => /\bhref="([^"]*)"/u.exec(tag)?.[1] ?? '';

export const headEndOf = (html) => html.indexOf('</head>');

/**
 * The document split at its head.
 *
 * Placement is the whole subject of the tests that use these, so it is worth being
 * explicit about why they are two halves rather than one string: a stylesheet that
 * arrives after `</head>` is a different defect from one that arrives inside it, at a
 * different cost, and the distinction is invisible unless something draws it.
 */
export const inHead = (html) => html.slice(0, headEndOf(html));
export const afterHead = (html) => html.slice(headEndOf(html));

/** The emitted stylesheet a stylesheet link points at, or `''` when it names none. */
export const emittedSheet = (stylesheets, tag) =>
  stylesheets.get(hrefOf(tag).split('/').pop() ?? '') ?? '';

/**
 * Does this stylesheet carry all three of these markers?
 *
 * Three, not one, on purpose. A single marker can be produced by a fragment of the
 * sheet — a tree-shaken utility, or the authored rules without the Tailwind layer —
 * and "the sheet arrived" is a claim about the whole of it. Together, one `@utility`
 * rule, one theme custom property and one unrelated authored rule, they only appear
 * together if the compiled sheet did.
 */
export const carriesGlobalSheet = (css, markers) => markers.every((marker) => css.includes(marker));
