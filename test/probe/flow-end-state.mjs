/**
 * Bounded probe: what does the flow row report at its final height?
 *
 * The re-anchor needs to know the row has finished, and a "two frames looked the
 * same" test is fooled by a plateau inside the transition — WebKit's evidence
 * key growth plateaus at -134 for several frames before finishing. A plateau is
 * not the end, so the test needs a physical end-state instead.
 *
 * The open row is `grid-template-rows: 1fr`, so its final height is the content's
 * natural height. This prints height against scrollHeight every frame to find
 * out whether that identity actually holds before the re-anchor relies on it.
 */
import { chromium, webkit } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';

for (const [name, runner] of Object.entries({ chromium, webkit })) {
  const browser = await runner.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.trace = [];
    const key = document.querySelector('#evidence-key');
    const flow = key.querySelector('.disclosure-flow');
    const sample = () => {
      const height = flow.getBoundingClientRect().height;
      const final = key.open;
      window.trace.push({ h: Math.round(height), sh: flow.scrollHeight, open: final });
      if (key.open || window.trace.length < 400) requestAnimationFrame(sample);
    };
    key.querySelector('summary').click();
    requestAnimationFrame(sample);
  });
  await page.waitForTimeout(1400);
  const trace = await page.evaluate(() => window.trace);
  const distinct = [...new Map(trace.map((row) => [row.h, row])).values()];
  const last = distinct.at(-1);
  console.log(`[${name}] distinct heights: ${distinct.map((row) => row.h).join(' ')}`);
  console.log(`[${name}] final height ${last.h} vs scrollHeight ${last.sh} (open=${last.open})`);
  await browser.close();
}
