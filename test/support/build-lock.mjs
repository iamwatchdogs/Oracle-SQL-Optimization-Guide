/*
 * One build at a time, across processes.
 *
 * This exists because `test/support/built-site.mjs` cannot hold the lock itself, and the
 * reason is in `vitest.config.mjs`: `pool: 'forks'`, file parallelism left on. Forks mean
 * separate PROCESSES, so the module-level promise chain a test helper reaches for does
 * not exist between two test files. Two integration files need a `dist/` that reflects
 * the current sources, and `astro build` writes into `dist/` in place rather than
 * swapping a finished directory into it — so two at once means one of them reads a
 * half-written page.
 *
 * That is not a theoretical flake. It is a test asserting against a file another test
 * was mid-way through writing, which is the specific dishonesty `built-site.mjs` was
 * written to prevent, arriving by a new route.
 *
 * `open(..., 'wx')` is the primitive: create-exclusive is atomic everywhere this suite
 * runs, so exactly one process wins and the rest wait. The lock file lives in
 * `node_modules/.astro/` and not in `dist/` for the same reason `built-site.mjs` deletes
 * caches rather than trusting them — a lock is a cache of the fact "a build is running",
 * and it must not sit in the directory whose contents are being asserted.
 */
import { open, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = new URL('../../', import.meta.url).pathname;

const LOCK = path.join(repoRoot, 'node_modules', '.astro', 'built-site.lock');

/**
 * How long a waiter believes a lock before treating it as abandoned.
 *
 * A little over the 120 s `playwright.config.mjs` allows its own `webServer` build,
 * because that is the longest a legitimate `astro build` in this repository can take.
 * Below it a slow build gets its lock stolen mid-write; far above it, one interrupted
 * command becomes a two-minute tax on the next run.
 */
const STALE_AFTER_MS = 150_000;

/**
 * `await` inside a loop is a lint error here, and here it would also be a lie: polling
 * for a lock IS a loop, and there is nothing to parallelise. So the retry is recursion —
 * each attempt is its own suspended frame, and the stack does not grow while it waits.
 */
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The open handle if the lock was taken, or `null` if somebody else holds it. */
const tryAcquire = async () => {
  try {
    return await open(LOCK, 'wx');
  } catch {
    /*
     * Optional catch binding, and deliberately not inspecting the error. Every failure
     * here means the same thing to this function — the exclusive create did not happen —
     * and the caller re-derives what it needs from the lock file's own mtime.
     */
    return null;
  }
};

const lockIsAbandoned = async () => {
  const heldSince = await stat(LOCK).then(
    (stats) => stats.mtimeMs,
    /* No lock file: the holder released it between our create and this stat. */
    () => Date.now(),
  );
  return Date.now() - heldSince > STALE_AFTER_MS;
};

/**
 * Hold the build lock for as long as `task` runs, or wait for whoever holds it.
 *
 * An abandoned lock is broken rather than waited out, and the wait after breaking it is
 * zero: the next `tryAcquire` is what decides. A run killed mid-build would otherwise
 * make every later run sit out `STALE_AFTER_MS` before it could start.
 */
export const withBuildLock = async (task) => {
  const handle = await tryAcquire();

  if (handle === null) {
    if (await lockIsAbandoned()) {
      await rm(LOCK, { force: true });
    } else {
      await sleep(250);
    }
    return withBuildLock(task);
  }

  try {
    return await task();
  } finally {
    await handle.close();
    await rm(LOCK, { force: true });
  }
};
