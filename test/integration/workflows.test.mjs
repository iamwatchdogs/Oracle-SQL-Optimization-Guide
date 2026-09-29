import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { expect, test } from 'vitest';
import { SITE_BASE } from '../../src/lib/site.mjs';

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const workflow = async (name) => parse(await read(`../../.github/workflows/${name}`));
const packageJson = async () => JSON.parse(await read('../../package.json'));

/**
 * The pipelines.
 *
 * There was no CI at all, which meant the pre-push gate was the only thing
 * standing between a branch and a broken deploy — and a gate that only runs on the
 * machine of whoever pushes is not a gate, it is a habit.
 */
test('there is a CI workflow and a deploy workflow', async () => {
  const ci = await workflow('ci.yml');
  const deploy = await workflow('deploy.yml');

  expect(Object.keys(ci.jobs).length).toBeGreaterThan(0);
  expect(Object.keys(deploy.jobs)).toContain('build');
  expect(Object.keys(deploy.jobs)).toContain('deploy');
});

test('CI runs on pull requests, not only on push', async () => {
  const ci = await workflow('ci.yml');

  /*
   * A workflow that runs after merge cannot stop a change. Pull requests are the
   * whole point of having one.
   */
  expect(ci.on.pull_request).toBeDefined();
  expect(ci.on.push).toBeDefined();
});

test('CI runs the same gate the developer runs locally', async () => {
  const ci = await workflow('ci.yml');
  const run = ci.jobs.verify.steps
    .map((step) => step.run)
    .filter(Boolean)
    .join('\n');
  const scripts = await packageJson();

  /*
   * The top-level gates from `verify`, each a command a person could also type.
   *
   * `quality` is asserted by name rather than expanded into its four stages: it
   * is the local gate, and expanding it here would mean updating this test every
   * time a stage is added to it — which is exactly the kind of second copy that
   * lets two things drift. Running `bun run quality` rather than restating its
   * parts is what keeps them the same.
   */
  const names = ['quality', 'test', 'build', 'test:e2e'];
  const gates = names.map((name) => `bun run ${name}`);

  gates.forEach((gate, index) => {
    /* Anchored, and not a bare `toContain`: `bun run test` is a substring of
       `bun run test:e2e`, so deleting the unit-test step would leave this green. */
    expect(run, `CI does not run "${gate}"`).toMatch(
      new RegExp(`^\\s*${gate.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s*$`, 'mu'),
    );
    /* The script a gate invokes has to exist, or `bun run` fails at the first step
       rather than at the one that was actually missing. */
    expect(scripts.scripts[names[index]], `no "${names[index]}" script`).toBeTruthy();
  });
});

test('the local verify script is the gate both sides agree on', async () => {
  const scripts = await packageJson();

  /* Read here rather than asserted elsewhere, so a change to `verify` is visible
     in the test that says what the gate is. */
  expect(scripts.scripts.verify).toBe(
    'bun run quality && bun run test && bun run build && bun run test:e2e',
  );
});

test('the deploy is gated on the same checks the branch is', async () => {
  const ci = await workflow('ci.yml');
  const deploy = await workflow('deploy.yml');

  /*
   * Deploy is a separate workflow because it needs `pages: write`, and this
   * project should not grant that on every push. The cost of splitting them is
   * that nothing in either file forces the two to agree — both require `main`, and
   * CI covers pull requests, so a change *through a pull request* is checked.
   *
   * A direct push to `main` still deploys unchecked. Closing that is a repository
   * setting, not a file: branch protection with CI as a required check. The
   * README says so, because a guarantee that depends on a setting nothing in the
   * repository mentions is not a guarantee.
   */
  expect(deploy.on.push.branches).toEqual(['main']);
  expect(ci.on.push.branches).toEqual(['main']);
  expect(deploy.jobs.deploy.needs).toBe('build');
});

test('the deploy builds for the same base the site is configured with', async () => {
  const deploy = await workflow('deploy.yml');

  /*
   * The base is one fact in two places: `site.mjs` for the build, and the
   * workflow so the deployment is explicit about where it is going. They have to
   * agree, and the only thing stopping a rename of the repository from shipping a
   * site full of origin-root URLs is this test.
   */
  expect(deploy.env.SITE_BASE).toBe(SITE_BASE);
  expect(deploy.env.SITE_BASE).toBe('/Oracle-SQL-Optimization-Guide');
});

test('the deploy needs no more permission than publishing requires', async () => {
  const ci = await workflow('ci.yml');
  const deploy = await workflow('deploy.yml');

  expect(ci.permissions).toEqual({ contents: 'read' });
  expect(deploy.permissions).toEqual({
    contents: 'read',
    pages: 'write',
    'id-token': 'write',
  });
});

test('concurrent runs are cancelled on CI and serialised on deploy', async () => {
  const ci = await workflow('ci.yml');
  const deploy = await workflow('deploy.yml');

  /*
   * Opposite on purpose. A check only describes the current tip, so a superseded
   * run is wasted minutes. A deployment writes a live site, and Pages already
   * serialises them — cancelling one would leave a commit undeployed with nothing
   * to retry it.
   */
  expect(ci.concurrency['cancel-in-progress']).toBe(true);
  expect(deploy.concurrency['cancel-in-progress']).toBe(false);
  expect(deploy.concurrency.group).toBe('pages');
});

test('the deploy uses the official Astro action, not a hand-rolled upload', async () => {
  const deploy = await workflow('deploy.yml');
  const uses = deploy.jobs.build.steps.map((step) => step.uses ?? '');

  /*
   * The reason is one behaviour. The action passes `include-hidden-files: true` to
   * the artifact upload, and a hand-rolled one does not: its internal tar drops
   * every dot-prefixed entry, which takes `.nojekyll` with it. Inert until
   * someone switches Pages back to a branch deploy, at which point Jekyll eats
   * `dist/_astro/` and the site loses its stylesheet.
   */
  expect(uses.some((action) => action.startsWith('withastro/action@'))).toBe(true);
});

test('every action is pinned to a major tag', async () => {
  const documents = await Promise.all([workflow('ci.yml'), workflow('deploy.yml')]);

  const actions = documents.flatMap((doc) =>
    Object.values(doc.jobs)
      .flatMap((job) => job.steps)
      .map((step) => step.uses)
      .filter(Boolean),
  );

  /*
   * A major tag, not a SHA and not `main`: a floating ref can change under a
   * pipeline that has already been reviewed. This asserts the shape, not that the
   * tag exists — no test can know which tags a third party has published, and the
   * versions here were read from each registry when the workflow was written.
   */
  actions.forEach((action) => {
    expect(action).toMatch(/^[\w.-]+\/[\w.-]+@v\d+$/u);
  });

  /* An empty list would pass by checking nothing. */
  expect(actions.length).toBeGreaterThan(4);
});

test('the lockfile is committed, because CI installs from it', async () => {
  const { packageManager } = await packageJson();
  const lock = await read('../../bun.lock');

  /*
   * `--frozen-lockfile` fails the job if the tree would change. A missing lockfile
   * would make that check vacuous rather than strict.
   */
  expect(lock.length).toBeGreaterThan(0);
  expect(packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/u);
});
