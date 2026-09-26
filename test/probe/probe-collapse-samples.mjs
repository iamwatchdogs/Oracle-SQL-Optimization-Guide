/**
 * PROBE — sample a disclosure's `grid-template-rows` through one collapse.
 *
 * Run: `bun test/probe/probe-collapse-samples.mjs` (needs the dev server on
 * :4321).
 *
 * Origin: this used to be an assertion in `test/e2e/disclosure.spec.mjs`
 * ("collapses through intermediate heights"). It asserted
 * `samples.at(-1) < 1` — that the last animation frame of the sampling window
 * landed exactly on the finished state. Across three engines it produced
 * `[135]`, `[135, 135]`, and a `transitionend` closing the window mid-flight at
 * ~135px, because the `transitioncancel` the controller triggers when it drops
 * `data-disclosure-closing` races the `transitionend` that was supposed to end
 * it. Every failure was a statement about the sampler.
 *
 * The deterministic half of the claim now lives in the spec: the collapse
 * DECLARES a 280ms transition (a jump would be `0s`) and the row settles to
 * `0px`. This probe is kept for inspecting the curve when the motion needs
 * tuning.
 *
 * Promotion map: `test/probe/README.md`.
 */
import { withPage, DESKTOP, ROUTES } from './harness.mjs';

export function sampleCollapseHeights(locator, budgetMs = 1200) {
  return locator.evaluate(async (el, budget) => {
    const flow = el.querySelector('.disclosure-flow');
    const seen = [];
    const record = () => {
      const h = +flow.getBoundingClientRect().height.toFixed(1);
      if (seen.at(-1) !== h) {
        seen.push(h);
      }
    };
    // `once: true` removes the listener, but a descendant's `transitionend`
    // would otherwise end the window early.
    const watch = (names) => {
      return new Promise((resolve) => {
        const settle = (event) => {
          if (event.target === flow) {
            resolve();
          }
        };
        names.forEach((name) => flow.addEventListener(name, settle, { once: true }));
      });
    };
    const after = (ms) => {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    };

    const started = watch(['transitionrun', 'transitionstart']);
    const finished = watch(['transitionend', 'transitioncancel']);
    const deadline = after(budget);

    el.querySelector('summary').click();
    record();
    // `started` needs the same guard as `finished`: if the row never
    // transitions — reduced motion, or a state where the value does not change
    // — awaiting it alone hangs the evaluate to the test timeout.
    await Promise.race([started, deadline]);
    let running = true;
    const tick = () => {
      if (running) {
        record();
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    await Promise.race([finished, deadline]);
    running = false;
    record();
    return seen;
  }, budgetMs);
}

const DISCLOSURE = `
  <details class="disclosure" data-probe>
    <summary>Probe disclosure</summary>
    <div class="disclosure-flow">
      <div class="disclosure-content-inner disclosure-flow-inner">
        <p>First paragraph with enough copy to give the grid a measurable intrinsic height while it collapses.</p>
        <p>Second paragraph so the open height is unambiguous.</p>
        <p>Third paragraph adds margin above the collapse measurement floor.</p>
      </div>
    </div>
  </details>
`;

async function main() {
  await withPage(DESKTOP, ROUTES.howToProve, async (page) => {
    await page.evaluate((markup) => {
      document.querySelector('article.prose')?.insertAdjacentHTML('beforeend', markup);
    }, DISCLOSURE);
    // The probe is injected at the END of a long article, so an
    // actionability-checked click on the summary times out. Click in the page.
    const details = page.locator('[data-probe]');
    await page.evaluate(() => {
      document.querySelector('[data-probe] summary').click();
    });
    await page.waitForTimeout(600);
    const samples = await sampleCollapseHeights(details);
    console.log('sampled heights:', samples.join(' -> '));
    console.log('distinct:', new Set(samples).size);
  });
}

await main();
