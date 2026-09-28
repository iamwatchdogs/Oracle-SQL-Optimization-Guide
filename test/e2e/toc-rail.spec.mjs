import { expect, test } from '@playwright/test';
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT } from './support/toc.mjs';
import { readingEdges } from './support/reading-surface.mjs';
import {
  articleRight,
  collapseRail,
  FLAGSHIP,
  isCentred,
  RAIL,
  RAIL_TOGGLE,
  railGeometry,
  rootFlag,
  shellLeft,
} from './support/reading-prefs.mjs';

/*
 * The collapsible TOC rail.
 *
 * Two states, one preference, and the control that has to outlive the thing it
 * controls. The rail is the first track of the reading surface's grid, so
 * collapsing it is a track width and a gutter, and the reading column — already
 * `flex justify-center` inside that track — re-centres on its own.
 */

async function opensOnTheRailAndClosesToAnEdgeTab({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);

  const open = await railGeometry(page);
  expect(open.track).toBe('280px');
  expect(open.rail.width).toBe(280);
  expect(open.attribute).toBeUndefined();
  expect(open.cellVisibility).toBe('visible');
  /* The control is not hidden when the rail is open — it is the rail's own
     collapse button, and it is what closes the rail. It is `visibility: visible` in
     both states, which is the property the two-control version could not have:
     there was always one state in which nothing was under the reader's cursor. */
  expect(open.toggleVisibility).toBe('visible');

  await collapseRail(page);

  const closed = await railGeometry(page);
  /* Two tracks at both ends, never one: interpolating a two-track template to a
     single-track one is not a transition, it is a snap. And the gutter has to
     close with the track or the column lands 24px off the page's axis. */
  expect(closed.gap).toBe('0px');
  expect(closed.cellVisibility).toBe('hidden');
  expect(closed.attribute).toBe('collapsed');
  expect(closed.stored).toBe('collapsed');
  /* One control, so one `aria-expanded`. The two-control version reported two and
     had to keep them in step. */
  expect(closed.expanded).toEqual(['false']);

  /* "The content should be centered" means the TEXT block, not the track. The
     46rem track is wider than the 68ch measure, so a centred track still leaves
     the prose hanging left of the axis unless the column is capped too. */
  expect(isCentred(closed.article.left, closed.article.width, DESKTOP_VIEWPORT.width)).toBe(true);
}

/*
 * One control, and it travels rather than being replaced.
 *
 * The previous version of this file asserted two things about two controls: that
 * the edge tab landed on the shell's left edge, and that pressing it reopened the
 * rail. Both passed while the interaction was broken, because the button the
 * reader actually pressed was at x=296 and the control that appeared in its place
 * was at x=64 — 232px away. A test that checks each end separately cannot see
 * that. This one takes the button's position before and after and asserts the
 * distance it moved, which is the thing a reader feels.
 */
async function movesTheControlRatherThanReplacingIt({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);
  const shell = await shellLeft(page);
  const control = page.locator(RAIL_TOGGLE);

  const before = await control.boundingBox();
  expect(before).not.toBeNull();
  /* Open: the rail's right edge, less the control and the header's 1rem. */
  expect(before.width).toBeGreaterThanOrEqual(44);
  expect(before.height).toBeGreaterThanOrEqual(44);

  await collapseRail(page);
  const after = await control.boundingBox();
  /* Collapsed: the shell's own left edge, which is the only part of the margin
     free once the rail is shut. */
  expect(Math.abs(after.x - shell)).toBeLessThanOrEqual(1);
  /* And it is the SAME node — not a control that appeared where another one left. */
  expect(await page.locator(RAIL_TOGGLE).count()).toBe(1);
  expect(await control.evaluate((n) => getComputedStyle(n).visibility)).toBe('visible');
  /* It stepped down as well, to clear the running head's row, which owns the band
     from the header down to 97px at the left edge. */
  expect(after.y).toBeGreaterThan(before.y);

  await control.click();
  await expect.poll(async () => (await railGeometry(page)).track).toBe('280px');
  expect(await rootFlag(page, 'readingToc')).toBeUndefined();
}

async function turnsItsArrowTheWayTheRailWent({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);

  const rotate = () =>
    page.locator(`${RAIL_TOGGLE} .toc-rail-chevron`).evaluate((n) => getComputedStyle(n).transform);

  const closed = await rotate();
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(closed);

  await collapseRail(page);
  /* 180° is the expand chevron: the same glyph, turned, so the rotation is the
     transition rather than a swap between two hard-coded paths. */
  const open = await rotate();
  expect(open).toBe('matrix(-1, 0, 0, -1, 0, 0)');
}

async function survivesAReloadAndAClientNavigation({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);
  await collapseRail(page);

  await page.reload();
  await expect.poll(async () => (await railGeometry(page)).attribute).toBe('collapsed');

  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((anchor) =>
      anchor.getAttribute('href')?.startsWith('/03-toolbox/'),
    );
    link.click();
  });
  await page.waitForURL('**/03-toolbox/**');
  /* The router replaces the whole document, which replaces `<html>`; the state
     has to come back from storage rather than from the attribute that went with
     the old one. */
  await expect.poll(async () => (await railGeometry(page)).attribute).toBe('collapsed');
}

async function isInertOnAPhone({ page }) {
  await page.setViewportSize(PHONE_VIEWPORT);
  await page.goto(FLAGSHIP);

  /* The rail does not exist below `lg`, so its preference is inert — and the
     mobile disclosure is the only outline a reader has there. */
  await expect(page.locator(RAIL)).toBeHidden();
  await expect(page.locator(RAIL_TOGGLE)).toBeHidden();
  await expect(page.locator('[data-toc-mobile]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(PHONE_VIEWPORT.width);
}

async function keepsThePagerOnTheProseRightEdge({ page }) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(FLAGSHIP);

  expect((await readingEdges(page)).pager.right).toBe(await articleRight(page));
  await collapseRail(page);
  expect((await readingEdges(page)).pager.right).toBe(await articleRight(page));
}

test.describe('the collapsible TOC rail', () => {
  test(
    'opens on the rail, closes to the gutter, and centres the reading column',
    opensOnTheRailAndClosesToAnEdgeTab,
  );
  test(
    'moves the control into the gutter rather than replacing it',
    movesTheControlRatherThanReplacingIt,
  );

  test('turns its arrow the way the rail went', turnsItsArrowTheWayTheRailWent);
  test(
    'keeps the collapsed state across a reload and a client navigation',
    survivesAReloadAndAClientNavigation,
  );
  test('leaves the rail, the toggle and the mobile list alone on a phone', isInertOnAPhone);
  test('keeps the pager on the prose right edge in both states', keepsThePagerOnTheProseRightEdge);
});
