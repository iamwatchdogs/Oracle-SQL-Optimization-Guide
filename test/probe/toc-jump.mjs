/**
 * Bounded probe: where does a jumped-to heading come to rest after the mobile TOC
 * collapses?
 *
 * The e2e gate waits for the heading to land in the upper 60% of the viewport and
 * times out otherwise, so it can fail without saying where the heading actually
 * went. This traces the heading's position and the flow row's height together, so
 * a missed re-anchor is distinguishable from a re-anchor that aimed at the wrong
 * place.
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';
const ARTICLE = '/00-preface/02-how-to-prove-a-win/';

const browser = await chromium.launch();
/* The e2e gate runs this on the `mobile-chromium` project, which is a Pixel 7
 * device profile — `isMobile` and `hasTouch` included — so the probe has to use
 * the same profile or it measures a different browser than the test fails on. */
const page = await browser.newPage({ ...devices['Pixel 7'] });
await page.goto(`${BASE}${ARTICLE}`, { waitUntil: 'networkidle' });

const details = page.locator('[data-toc-mobile]');
await details.locator('summary').click();
/* Mirror the e2e gate, which confirms the panel is open before it clicks a link. */
await page.waitForFunction(
  () => document.querySelector('[data-toc-mobile]')?.hasAttribute('open') === true,
  null,
  { timeout: 5000 },
);
const id = await details.locator('[data-toc-link]').nth(2).getAttribute('data-toc-link');

await page.evaluate((target) => {
  window.trace = [];
  const started = performance.now();
  const tick = () => {
    const heading = document.querySelector('#' + CSS.escape(target));
    const flow = document.querySelector('[data-toc-mobile] .disclosure-flow');
    window.trace.push({
      t: Math.round(performance.now() - started),
      top: heading ? Math.round(heading.getBoundingClientRect().top) : null,
      flow: flow ? Math.round(flow.getBoundingClientRect().height) : null,
      open: document.querySelector('[data-toc-mobile]').hasAttribute('open'),
    });
    if (performance.now() - started < 1200) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, id);

await details.locator('[data-toc-link]').nth(2).click();
await page.waitForTimeout(1500);

const trace = await page.evaluate(() => window.trace);
const changes = trace.filter(
  (row, index) =>
    index === 0 || row.top !== trace[index - 1].top || row.flow !== trace[index - 1].flow,
);
console.log('id:', id);
for (const row of changes.slice(0, 14))
  console.log(`  t=${row.t}ms top=${row.top} flow=${row.flow} open=${row.open}`);
console.log('final:', JSON.stringify(trace.at(-1)));
const innerHeight = await page.evaluate(() => window.innerHeight);
const settled = trace.at(-1);
console.log(
  `gate wants 0 < top < ${Math.round(innerHeight * 0.6)} -> got ${settled.top}`,
  settled.top > 0 && settled.top < innerHeight * 0.6 ? 'PASS' : 'FAIL',
);
await browser.close();
