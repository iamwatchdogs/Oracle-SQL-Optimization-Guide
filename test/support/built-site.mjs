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
 */
import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

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
 */
const BUILD_INPUTS = [
  path.join(repoRoot, 'astro.config.mjs'),
  path.join(repoRoot, 'src/styles/global.css'),
];

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
    newestMtime(BUILD_INPUTS),
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
 */
export const ensureBuild = async () => {
  if (await buildIsCurrent()) {
    return 'reused the build already in dist/';
  }

  try {
    await run('bun', ['run', 'build'], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
  } catch (failure) {
    /*
     * `execFile`'s rejection carries the streams but no useful message, and a
     * build that fails here fails for the same reason it would fail in
     * `bun run build` — so the output is the whole diagnosis and it must survive
     * into the test failure rather than arriving as a bare "Command failed".
     * `cause` keeps the original attached so the stack is not lost.
     */
    throw new Error(`astro build failed while preparing the built site.\n${failure.stderr ?? ''}`, {
      cause: failure,
    });
  }

  return 'built dist/ from the current sources';
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
