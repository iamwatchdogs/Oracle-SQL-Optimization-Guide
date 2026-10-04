import { expect, test } from 'vitest';
import {
  bindThemeController,
  DEFAULT_THEME,
  LIGHT_THEME,
} from '../../src/lib/theme-controller.mjs';

import { createHarness, FakeElement } from '../fixtures/theme-controller.fixtures.mjs';

/*
 * What `setRootTheme` and `syncButtonState` COST, as distinct from what they decide.
 *
 * `setRootTheme` writes `root.dataset.theme` and `syncButtonState` writes the
 * toggle's `aria-label`, both unguarded and both re-run by every `sync()`. `sync()`
 * fires on bind, on `astro:page-load` and on `astro:after-swap`, so a reader pays
 * them on every navigation, and on a cold load the inline bootstrap has already
 * put the correct value on `<html>` before first paint.
 *
 * The `dataset.theme` write is the expensive one, and asymmetrically so.
 * `[data-theme='light']` (`src/styles/global.css:401-435`) redefines 24 custom
 * properties for the whole document — `--paper`, `--ink`, `--rule`, `--accent`,
 * `--zone-a`..`--zone-d`, `--table-zebra`, `--focus`, `--selection-bg`,
 * `--scrollbar-thumb` and the rest — so a reader who has chosen light pays a
 * full-document style recalculation on every navigation to restate a value that
 * has not moved. `[data-theme='dark']` has no standalone block at all: dark is the
 * `:root` default (`global.css:29-30`), so writing `'dark'` re-asserts values that
 * were never overridden and invalidates nothing extra. The guard is therefore
 * worth strictly more in the light direction, which is exactly the direction a
 * reader in the default theme never takes — which is why this is easy to miss.
 *
 * None of that shows up in the output. Theme, icon and accessible name come out
 * identical whether the values are written or skipped, which is why it survived:
 * an assertion on the rendered state passes either way. The waste is in the side
 * effects, and counting writes is the only instrument that can see it.
 *
 * So the tests come in two parts and the fix has to keep them apart:
 *
 * 1. the redundant case — a root that already holds the theme being written must
 *    not be written at all (tests one, two and four);
 * 2. the state, which must come out the same as unconditional writes would leave
 *    it — a cost change, not a behaviour change, holding before AND after.
 *
 * `reading-prefs-store.mjs:93-117` is the established pattern being matched, and
 * the comment above `applyAttribute` there is why it had to be said once already.
 *
 * `createHarness`/`FakeElement` build the right fakes but count nothing, and the
 * writes are the entire subject here, so the counters are bolted on in this file
 * rather than added to the shared fixture — the same call
 * `reading-toc-idle-writes.test.mjs:59-68` made for `createFakeNode`.
 */

/*
 * Both routes are recorded separately — `dataset.theme` for the attribute,
 * `setAttribute('aria-label', …)` for the accessible name — because a counter on
 * one route alone would let half of each sync's no-ops hide behind the other.
 */
function countWrites(node) {
  const writes = { labels: [], themes: [] };
  node.dataset = new Proxy(node.dataset, {
    set(data, property, value) {
      if (property === 'theme') {
        writes.themes.push(value);
      }
      data[property] = value;
      return true;
    },
  });
  const { setAttribute } = node;
  node.setAttribute = (name, value) => {
    if (name === 'aria-label') {
      writes.labels.push(value);
    }
    setAttribute.call(node, name, value);
  };
  return Object.assign(node, {
    writes,
    resetWrites() {
      writes.labels.length = 0;
      writes.themes.length = 0;
    },
  });
}

/*
 * The shared harness, instrumented. `root` and `document.documentElement` are the
 * same object, so wrapping `root` in place counts every write the controller makes
 * on either path.
 */
function createCountedHarness(options) {
  const harness = createHarness(options);
  return {
    ...harness,
    root: countWrites(harness.root),
    toggle: countWrites(harness.toggle),
  };
}

const VALID_THEMES = [DEFAULT_THEME, LIGHT_THEME];

/*
 * The case that happens on every navigation in the default theme, and so the one
 * that matters most: the inline bootstrap has already written `data-theme="dark"`,
 * and storage is empty, so both writes the controller makes restate that value.
 */
test('binding onto a dark root does not rewrite data-theme', () => {
  const { document, root, storage } = createCountedHarness();

  bindThemeController({ document, storage });

  expect(root.dataset.theme).toBe(DEFAULT_THEME);
  expect(root.writes.themes).toEqual([]);
});

/*
 * The accessible name rides the same `sync()`. `BaseLayout.astro` ships the
 * button already carrying `aria-label="Switch to light theme"`, which is exactly
 * what dark resolves to, so this write is redundant too.
 */
test('binding onto a dark root does not rewrite the toggle aria-label', () => {
  const { document, storage, toggle } = createCountedHarness();

  bindThemeController({ document, storage });

  expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme');
  expect(toggle.writes.labels).toEqual([]);
});

/*
 * The half that "skip when it matches" alone would let through: skipping correctly
 * AND writing correctly. A comparison that never writes is green on the test above
 * and visually broken on this one — the theme that carries the change.
 *
 * Exact write counts are deliberately NOT pinned here. `toggleTheme` writes once
 * and `sync()` writes again, and collapsing those two into one is a cost detail
 * rather than the contract; the contract is that a changed value is written. So
 * this passes before the fix and must keep passing after it.
 */
test('toggling to a different theme still writes the attribute and the label', () => {
  const { document, root, storage, toggle } = createCountedHarness();
  const controller = bindThemeController({ document, storage });

  controller.toggle();

  expect(root.dataset.theme).toBe(LIGHT_THEME);
  expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');
  expect(root.writes.themes).toContain(LIGHT_THEME);
  expect(toggle.writes.labels).toContain('Switch to dark theme');
});

/*
 * The same assertion as the first test in principle — a root that already holds
 * the theme being written must not be written — and worth having separately because
 * it is reached by a different route. The first test covers arriving on a page
 * through `bind`, where the bootstrap painted dark; this one covers a reader who
 * has chosen light, arrives somewhere, and pays a second `sync` for a value that
 * already agrees with the one on `<html>`. Light is the expensive direction, so
 * this is the redundant write that actually costs, and it is the path
 * `astro:page-load` and `astro:after-swap` take on every navigation after a
 * toggle. A fix that guards `initializeTheme` but not `sync()` would still fail
 * here.
 */
test('re-syncing a theme the root already holds writes nothing', () => {
  const { document, root, storage, toggle } = createCountedHarness();
  const controller = bindThemeController({ document, storage });

  controller.toggle();
  root.resetWrites();
  toggle.resetWrites();

  controller.sync();

  expect(root.dataset.theme).toBe(LIGHT_THEME);
  expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme');
  expect(root.writes.themes).toEqual([]);
  expect(toggle.writes.labels).toEqual([]);
});

/*
 * A guard must not become a way to leave the attribute unset. `normalizeTheme`
 * collapses anything that is not `'light'` to `'dark'`, so garbage in storage still
 * has to land on a real value — and the root here starts with no `data-theme` at
 * all, which is the state where "skip when it matches" would have nothing to
 * compare against. Passes before the fix and must keep passing after it.
 */
test('an unknown stored theme still normalises onto a real attribute value', () => {
  const { document, storage } = createHarness({ storedTheme: 'chartreuse' });
  const root = countWrites(new FakeElement());
  document.documentElement = root;

  bindThemeController({ document, storage });

  expect(root.dataset.theme).toBe(DEFAULT_THEME);
  expect(VALID_THEMES).toContain(root.dataset.theme);
  expect(root.writes.themes).toContain(DEFAULT_THEME);
});
