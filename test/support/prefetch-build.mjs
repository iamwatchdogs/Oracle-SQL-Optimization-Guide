/*
 * Reading the CONFIG and the BUILD for a prefetch scope — the two halves that are not markup.
 *
 * A sibling of `test/support/prefetch.mjs`, which reads the built pages and carries the table of which
 * link role should prefetch. This one reads `astro.config.mjs` and the bundle Astro bakes from it, and
 * answers the three questions a test cannot answer from the markup alone: what scope the config declares,
 * whether `prefetchAll` was written out or merely defaulted, and whether an href names a route this build
 * actually wrote.
 *
 * They are separate files for the reason the repository's 300-line ceiling forces rather than because the
 * concerns are unrelated — a support module that carries the role table, the markup readers, the config
 * reader and the bundle reader is a file nobody can read, and the split here is the one that leaves each
 * half with room to say WHY.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { distRoot, walk } from './built-site.mjs';

const repoRoot = new URL('../../', import.meta.url).pathname;

/**
 * Does this href, less a deployment prefix, name a file the build wrote?
 *
 * THE PREFIX IS SOLVED FOR, not declared, and that is the whole reason this is a function rather than a
 * comparison against `resolveBase()`. `test/support/built-site.mjs` builds with `execFile('bun',
 * ['run', 'build'])` and inherits `process.env` — and vitest puts `BASE_URL` in it. Vite resolves its own
 * base from `process.env.BASE_URL` when nothing else sets one, and `import.meta.env.BASE_URL` is what
 * `withBase` reads (`src/lib/site.mjs:112-115`), so a build triggered from inside `bun run test` emits
 * UNPREFIXED hrefs where one run from a shell emits prefixed ones. Worse, it poisons Vite's transform cache
 * under `node_modules/.vite`, so a LATER shell build reuses the poisoned module and comes out unprefixed
 * too — a `dist/` whose canonicals carry the prefix and whose links do not. Measured on this commit:
 * `rm -rf node_modules/.vite && bun run build` writes a prefixed nav href, and the same build with that
 * cache in place writes `/00-preface/`.
 *
 * That is a pre-existing property of the shared helper and it is deliberately NOT fixed here — a different
 * concern, and changing `ensureBuild` would move every other reader of `dist/`. So the only question asked
 * is the one that matters: does this href, less a deployment prefix, name a route the build wrote?
 *
 * Three dropped segments is generous on purpose — the shapes this project supports are 0 (`SITE_BASE=/`),
 * 1 (`/Oracle-SQL-Optimization-Guide`, the constant at `src/lib/site.mjs:45`) and 2 for a user/repo Pages
 * mount — and it costs nothing while keeping a real route from being mistaken for a prefix. The FULL drop
 * is included and is not an edge case: the book root has no segments left once the prefix is gone, and on
 * `/00-preface/` that link is the pager's `prev` (`toUrl('index')`, `[...slug].astro:22-28`).
 */
export const servesAsRoute = (built, href) => {
  const segments = href.split('/').filter((segment) => segment !== '');
  const attempts = Math.min(segments.length, 3) + 1;
  return Array.from({ length: attempts }, (_, dropped) => dropped).some((dropped) => {
    const rest = segments.slice(dropped);
    const route = rest.length === 0 ? '/' : `/${rest.join('/')}${href.endsWith('/') ? '/' : ''}`;
    return built.has(route === '/' ? '/index.html' : `${route}index.html`);
  });
};

/**
 * The `prefetch` block of `astro.config.mjs`, as written.
 *
 * Read as source rather than as a resolved config object, because the distinction the callers need is
 * `prefetchAll: false` written EXPLICITLY against the key absent, and only the source text tells those
 * apart — `astro.config.mjs` says why an absent key is a different runtime value. Not read from the shipped
 * bundle either: it is minified, its baked constants are renamed (`dist/_astro/prefetch.*.js` holds `r=!1`,
 * not `prefetchAll = false`), and what it baked is proven in a browser in `test/e2e/prefetch-scope.spec.mjs`.
 *
 * BLOCK COMMENTS ARE STRIPPED FIRST, and that is not a detail. The comment above the setting quotes this
 * very line as the statement of what was wrong, so the first `prefetch: {` in the file belongs to a sentence
 * describing the defect — and the first version of this function matched THAT, reporting `prefetchAll:
 * true` against a build whose bundle held `r=!1`. Only the block form is stripped; `//` would eat the
 * `https://` in `REPO_URL`.
 */
export const prefetchConfig = async () => {
  const raw = await readFile(path.join(repoRoot, 'astro.config.mjs'), 'utf8');
  const source = raw.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  const block = /\bprefetch:\s*\{([^}]*)\}/u.exec(source);

  if (block === null) {
    return {
      declared: false,
      prefetchAll: undefined,
      hasPrefetchAllKey: false,
      defaultStrategy: undefined,
    };
  }

  return {
    declared: true,
    prefetchAll: /\bprefetchAll:\s*(true|false)/u.exec(block[1])?.[1] === 'true',
    hasPrefetchAllKey: /\bprefetchAll\s*:/u.test(block[1]),
    defaultStrategy: /\bdefaultStrategy:\s*'([^']+)'/u.exec(block[1])?.[1],
  };
};

/**
 * The shipped prefetch runtime, as `{ file, code }`, found by file name rather than by a hard-coded hash:
 * the bundle is renamed on every build whose content changes, and a hash-keyed reader goes red on an
 * unrelated dependency bump. More than one match is a caller-asserted failure: two bundles means two
 * runtimes, each with its own `prefetchedUrls` set, and half the scope.
 */
export const readPrefetchBundle = async () => {
  const files = (await walk(path.join(distRoot, '_astro'))).filter((file) =>
    path.basename(file).startsWith('prefetch.'),
  );
  return Promise.all(
    files.map(async (file) => ({
      file: `/_astro/${path.basename(file)}`,
      code: await readFile(file, 'utf8'),
    })),
  );
};
