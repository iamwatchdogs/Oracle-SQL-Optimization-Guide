/**
 * Bounded probe: does anything scroll the page AFTER the re-anchor has jumped?
 *
 * The e2e gate's anchor test fails on its first attempt in Chromium and WebKit
 * but lands correctly in a quiet browser, which points at ordering rather than
 * timing: if the router's own `#hash` scroll runs after the re-anchor, it aims
 * at the pre-growth layout and drags the target off screen.
 *
 * This watches the target's position and the scroll offset every frame for 1.2s
 * and reports the first frame each one last changes, so the two orders can be
 * compared directly.
 */
import { chromium, webkit } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';

for (const [name, runner] of Object.entries({ chromium, webkit })) {
  const browser = await runner.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/#evidence-key`, { waitUntil: 'networkidle' });
  const trace = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const key = document.querySelector('#evidence-key');
        const rows = [];
        let lastTop = null;
        let lastScroll = null;
        let topSettledAt = null;
        let scrollSettledAt = null;
        const start = performance.now();
        const tick = () => {
          const now = performance.now() - start;
          const top = Math.round(key.getBoundingClientRect().top);
          const scroll = Math.round(window.scrollY);
          if (top !== lastTop) {
            lastTop = top;
            topSettledAt = now;
            rows.push({ now: Math.round(now), top });
          }
          if (scroll !== lastScroll) {
            lastScroll = scroll;
            scrollSettledAt = now;
            rows.push({ now: Math.round(now), scroll });
          }
          if (now < 1200) requestAnimationFrame(tick);
          else
            resolve({
              rows,
              topSettledAt: Math.round(topSettledAt),
              scrollSettledAt: Math.round(scrollSettledAt),
            });
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(
    `[${name}] last target move at ${trace.topSettledAt}ms, last scroll at ${trace.scrollSettledAt}ms`,
  );
  console.log(`[${name}] ${JSON.stringify(trace.rows)}`);
  await browser.close();
}
