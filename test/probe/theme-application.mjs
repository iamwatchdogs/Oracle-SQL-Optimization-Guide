/**
 * Bounded probe: does the requested theme actually reach `<html>`?
 *
 * The audit sweep compares `requestedTheme` against
 * `document.documentElement.dataset.theme`, and 180 of 228 runs reported the
 * attribute as `undefined`. If that is real, every light-mode contrast number in
 * the sweep was measured against the dark palette and the whole light pass is
 * worthless. If it is a probe defect, the light pass stands.
 */
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';
const ROUTE = '/01-proven-techniques/';

for (const theme of ['dark', 'light']) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    try {
      localStorage.setItem('theme', value);
    } catch {}
  }, theme);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  const seen = await page.evaluate(() => ({
    dataTheme: document.documentElement.dataset.theme ?? null,
    className: document.documentElement.className,
    colorScheme: document.documentElement.style.colorScheme || null,
    stored: localStorage.getItem('theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log(theme, JSON.stringify(seen));
  await browser.close();
}
