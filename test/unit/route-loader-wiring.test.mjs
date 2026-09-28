import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { LOADER_MAX_VISIBLE_MS } from '../../src/lib/route-loader-timer.mjs';

const readRepoFile = (relativePath) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const controllerSource = () => readRepoFile('src/lib/route-loader.mjs');
const layoutSource = () => readRepoFile('src/layouts/BaseLayout.astro');

/** Strip block and line comments so prose about a retired pattern cannot satisfy
 * — or trip — a source-grep assertion. */
const stripComments = (source) =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/(^|[^:])\/\/.*$/gmu, '$1');

test('loader visibility is written as an attribute, never as a JS property', () => {
  const source = stripComments(controllerSource());

  /*
   * `data-[visible=true]:opacity-100` is an attribute selector. The retired
   * `loader.dataset` branch could never satisfy it, and writing to a plain
   * object's `dataset` produced no attribute at all — the loader stayed at
   * `opacity-0` for the whole navigation.
   *
   * Asserted against comment-stripped source: the file carries a note naming
   * `loader.dataset` to explain why it is gone, and a raw grep matched that
   * prose.
   */
  expect(source).toContain(`loader?.setAttribute?.('data-visible', String(visible))`);
  expect(source).not.toContain('VISIBLE_ATTRIBUTE');
  expect(source).not.toMatch(/loader\?\.dataset/u);
  expect(source).not.toMatch(/loader\.dataset/u);
  expect(source).not.toMatch(/\.dataset\s*=/u);
});

test('the reveal cap and the reveal gate are cleared by the same call', () => {
  /*
   * The CAP VALUE is asserted by importing the constant; the source is read only
   * for WIRING.
   *
   * The previous version asserted `expect(timer).toContain('export const
   * LOADER_MAX_VISIBLE_MS = 8000;')` — a test of the literal text of a
   * declaration. It passes whether or not the cap is ever scheduled, and it breaks
   * on a rename. The value is now checked as a value, and the source assertions
   * that remain are about which functions call which.
   */
  const source = controllerSource();
  const timer = readRepoFile('src/lib/route-loader-timer.mjs');

  expect(LOADER_MAX_VISIBLE_MS).toBe(8000);
  expect(timer).toContain('return { clear, schedule, scheduleCap };');
  expect(timer).toContain('const scheduleCap = (callback) => {');
  expect(timer).toContain('}, LOADER_MAX_VISIBLE_MS);');
  // Both timers are torn down by the one `clear()` the visual settler calls.
  expect(timer).toContain('timerFunctions.clearTimeout?.(revealId);');
  expect(timer).toContain('timerFunctions.clearTimeout?.(capId);');
  expect(source).toContain('timer.clear()');
});

test('BaseLayout wraps the loader only after setting pending state', () => {
  const source = layoutSource();
  const preparation = 'controller.beforePreparation(event.signal);';
  const wrapping = 'event.loader = wrapRouteLoader(';
  const prevented = '() => event.defaultPrevented';

  expect(source).toContain(
    "import { createRouteLoaderController, wrapRouteLoader } from '../lib/route-loader.mjs';",
  );
  expect(source).toContain(preparation);
  expect(source).toContain(wrapping);
  expect(source).toContain(prevented);
  expect(source.indexOf(preparation)).toBeLessThan(source.indexOf(wrapping));
  expect(source.indexOf(wrapping)).toBeLessThan(source.indexOf(prevented));
  expect(source).not.toContain('astro:after-swap');
});

test('BaseLayout cancels on before-swap as a safety net', () => {
  const source = layoutSource();

  /*
   * This assertion used to be `not.toContain('astro:before-swap')`, and that
   * negative blocked the safety net outright. Every documented exit from a
   * transition is covered by `pageLoad`, an abort, or `defaultPrevented`, but a
   * future Astro release that settles a navigation another way would otherwise
   * leave the loader up with a permanently announcing live region.
   */
  expect(source).toContain("addEventListener('astro:before-swap', () => controller.beforeSwap())");
  /*
   * `beforeSwap`, NOT `cancel`. `astro:before-swap` fires BEFORE
   * `astro:page-load`, so a handler that cleared the "a navigation was
   * prepared" flag would leave focus on the outgoing body after every
   * navigation — the focus handoff would silently never run.
   */
  expect(source).not.toContain("addEventListener('astro:before-swap', () => controller.cancel())");
});

test('BaseLayout sweeps the route announcer Astro never removes', () => {
  const source = layoutSource();

  /* Astro appends an `aria-live="assertive"` node to <body> on every completed
   * navigation and never removes it. The loader already moves focus to
   * `main#main`, so the announcement is a duplicate at best and an unbounded
   * DOM leak at worst. */
  expect(source).toContain("querySelectorAll('.astro-route-announcer')");
  expect(source).toContain('stale.remove()');
  /* Created after `astro:page-load` fires, hence the defer. */
  expect(source).toMatch(/setTimeout\(\(\) => \{[\s\S]{0,240}astro-route-announcer/u);
});
