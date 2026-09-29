import { expect, test } from '@playwright/test';
import { EVIDENCE_KEY } from './support/disclosure.mjs';
import { waitForStable } from './support/settle.mjs';

/**
 * Disclosure colour states and the chevron.
 *
 * Split from `disclosure-ui.spec.mjs` for file length only.
 *
 * The chevron is an authored SVG rotating 45 degrees via the `rotate` property
 * (`group-open:rotate-45`, plus an unlayered `rotate: 0deg` reset while the
 * controller is collapsing). The component used to draw a `+`-to-`x` marker from
 * two CSS pseudo-element bars instead, which was dead code and duplicated the
 * SVG; DESIGN.md also forbids substituting a glyph where an authored SVG
 * belongs.
 *
 * The open/close colour change is on a 180ms transition, so every read after a
 * click has to poll — sampling once returns the starting value and a test that
 * "passes" that way proves nothing.
 */
test.describe('shipped disclosures — colour states', () => {
  test(
    'the summary shifts from muted to full ink when open, in both themes',
    summaryShiftsMutedToFullInBothThemes,
  );

  test('the chevron is an authored SVG, not a Unicode glyph', chevronIsAnAuthoredSvg);

  test('the chevron rotates 45 degrees when open and snaps back when closed', chevronRotates);
});

/**
 * Both themes are checked by the same sequence, and the second theme's theme
 * swap needs the first theme's assertions to have finished, so the two runs are
 * sequential statements rather than a loop.
 */
/**
 * A summary's computed colour once it has stopped moving.
 *
 * The summary carries `transition: color 180ms`, so a read taken on the frame
 * after the click still returns the pre-click ink. `expect.poll` has to be used
 * to wait, but it resolves to `void` rather than the value it polled — so the
 * probe reports `null` for as long as the colour still equals `from`, and the
 * settled colour is what finally escapes. A colour that never moves fails here
 * with the offending value in the message.
 */
async function settledColorAfter(summary, from) {
  return await expect
    .poll(
      async () => {
        const color = await summary.evaluate((el) => getComputedStyle(el).color);
        return color === from ? null : color;
      },
      { message: `computed colour never settled away from ${from}` },
    )
    .not.toBeNull();
}

async function expectSummaryShiftInTheme(page, theme) {
  await page.goto('/');
  /*
   * Set the preference the way a reader does — `localStorage`, then reload — so
   * the inline head bootstrap applies it before first paint and the controller
   * reads the same value. Writing `document.documentElement.dataset.theme`
   * directly races `sync()`, which re-applies its own active theme on
   * `astro:page-load`, and that race is what made this test flaky.
   */
  await page.evaluate((value) => {
    window.localStorage.setItem('theme', value);
  }, theme);
  await page.reload();

  /*
   * Park the pointer away from the summary and open it with the keyboard, so
   * neither the idle nor the open reading is a `:hover` colour. A mouse click
   * leaves the cursor on the summary, and `details > summary:hover` is the
   * ACCENT in both themes — in light mode that made the idle and open values
   * identical (`rgb(45, 74, 154)`) and the assertion could never hold.
   */
  await page.mouse.move(0, 0);
  const summary = page.locator(`${EVIDENCE_KEY} > summary`);
  const idle = await summary.evaluate((el) => getComputedStyle(el).color);
  await (await waitForStable(summary)).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(EVIDENCE_KEY)).toHaveAttribute('open', '');
  const open = await settledColorAfter(summary, idle);
  expect(idle, `idle colour in ${theme}`).not.toBe(open);
  await page.mouse.move(0, 0);
}

async function summaryShiftsMutedToFullInBothThemes({ page }) {
  await expectSummaryShiftInTheme(page, 'dark');
  await expectSummaryShiftInTheme(page, 'light');
}

async function chevronIsAnAuthoredSvg({ page }) {
  await page.goto('/');
  const summaryText = await page.locator(`${EVIDENCE_KEY} > summary`).innerText();
  for (const glyph of ['+', '×', '▸', '▾', '▶', '▼', '⌄']) {
    expect(summaryText).not.toContain(glyph);
  }
  await expect(page.locator(`${EVIDENCE_KEY} .disclosure-icon`)).toHaveCount(1);
  await expect(page.locator(`${EVIDENCE_KEY} .disclosure-icon`)).toHaveAttribute(
    'aria-hidden',
    'true',
  );
}

/**
 * The chevron turns on the standalone `rotate` property, not on `transform`.
 *
 * `group-open:rotate-45` compiles to `rotate: 45deg` and the closing override
 * to `rotate: 0deg`, so `transform` is `none` at every state and polling it
 * proves nothing. The three exact values are `none` (no `rotate` declaration
 * while closed), `45deg` (open) and `none` again (the `0deg` closing override
 * is dropped together with the attribute once the transition ends).
 */
async function chevronRotates({ page }) {
  await page.goto('/');
  const icon = page.locator(`${EVIDENCE_KEY} .disclosure-icon`);
  const angle = () => icon.evaluate((el) => getComputedStyle(el).rotate);
  expect(await angle()).toBe('none');
  await page.locator(`${EVIDENCE_KEY} > summary`).click();
  await expect.poll(angle).toBe('45deg');
  await page.locator(`${EVIDENCE_KEY} > summary`).click();
  await expect.poll(angle).toBe('none');
}
