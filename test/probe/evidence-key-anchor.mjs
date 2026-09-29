/**
 * Bounded probe: where does the evidence key land after a `#evidence-key` load?
 *
 * The e2e gate reports a re-anchor miss in Firefox and WebKit, but only sometimes.
 * A missed re-anchor that a reader can hit is a product defect; one that only
 * appears when four browser projects compete for CPU is a harness artifact. This
 * runs the deep link in a quiet browser and traces the target's position frame by
 * frame, which separates the two:
 *
 * - `first` shows how far the target is from the header while the panel grows.
 * - `last` and `final` show where it comes to rest.
 *
 * If `final` is the header offset on every run while `first` is far off, the
 * re-anchor is doing its job and the e2e flake is contention, not the page.
 * If `final` is ever wrong, the page is genuinely mis-aimed on a cold load.
 */
import { firefox, webkit } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';
const RUNS = Number(process.env.PROBE_RUNS ?? 6);
const RUNNERS = { firefox, webkit };

for (const [name, runner] of Object.entries(RUNNERS)) {
  const runs = [];
  for (let index = 0; index < RUNS; index += 1) {
    const browser = await runner.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/#evidence-key`, { waitUntil: 'networkidle' });

    const trace = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const key = document.querySelector('#evidence-key');
          const samples = [];
          const tick = (time) => {
            samples.push({ t: Math.round(time), y: Math.round(key.getBoundingClientRect().top) });
            if (time < 1200) {
              requestAnimationFrame(tick);
            } else {
              resolve(samples);
            }
          };
          requestAnimationFrame(tick);
        }),
    );

    await page.waitForTimeout(400);
    const final = await page.evaluate(() =>
      Math.round(document.querySelector('#evidence-key').getBoundingClientRect().top),
    );
    runs.push({ final, whileGrowing: trace[0]?.y, afterSettling: trace.at(-1)?.y });
    await browser.close();
  }

  const settled = runs.map((run) => run.final);
  console.log(
    `[${name}] settled top: ${settled.join(', ')}  ` +
      `| while growing: ${runs.map((run) => run.whileGrowing).join(', ')}`,
  );
}
