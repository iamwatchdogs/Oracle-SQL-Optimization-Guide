/**
 * Bounded probe: which request 404s on every page?
 *
 * The audit sweep reports `console=error: Failed to load resource: 404` on all 38
 * routes, so it is site-wide rather than page-specific. Playwright's console text
 * does not name the URL, so this listens to the response events instead.
 */
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';

const browser = await chromium.launch();
const page = await browser.newPage();
const misses = [];

page.on('response', (response) => {
  if (response.status() >= 400) {
    misses.push(`${response.status()} ${response.url()}`);
  }
});
page.on('requestfailed', (request) => misses.push(`failed ${request.url()}`));
/* A `Failed to load resource` message carries no URL in its text, so read the
 * location the browser attached to it. */
page.on('console', (message) => {
  if (message.type() === 'error') {
    misses.push(`console ${message.text()} @ ${JSON.stringify(message.location())}`);
  }
});

for (const route of ['/', '/08-bonus-batch-api/']) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
}

console.log(misses.length > 0 ? misses.join('\n') : 'no failing requests');
await browser.close();
