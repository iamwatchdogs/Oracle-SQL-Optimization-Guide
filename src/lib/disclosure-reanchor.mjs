/* Longer than the 280ms `grid-template-rows` transition, so the transition path
 * wins when it fires and this is only a safety net. */
const REANCHOR_FALLBACK_MS = 400;

/*
 * Re-anchor the viewport once a disclosure has finished changing size.
 *
 * Two callers need this, and they need it for the same reason:
 *
 * - the mobile TOC panel sits ABOVE the article in the grid, so collapsing it
 *   animates `grid-template-rows` over 280ms and shifts everything below it upward
 *   — after the router has already scrolled to the target;
 * - the home page's evidence key lives inside a panel that GROWS when opened, which
 *   pushes its own heading back off screen after the router scrolled to it.
 *
 * In both cases a single re-anchor on the next frame is too early. A frame is
 * ~16ms into a 280ms transition, so the scroll is issued while the row is still
 * most of the way between where it was and where it is going, and the reader is
 * left mis-aimed. Firefox surfaced this because it runs the collapse slowly enough
 * for a test to sample mid-flight; every engine was wrong, by different amounts.
 *
 * Three settling paths, because the row does not always animate:
 *
 * - next frame: reduced motion, or a panel already at its final size, where the
 *   change is effectively instant and no transition ever fires;
 * - `transitionend` / `transitioncancel` on the flow: the normal animated path, and
 *   the same signal the disclosure controller itself uses;
 * - a timeout past the transition duration: a safety net for a row that neither
 *   animates nor emits an event, so the reader is never left mis-aimed.
 *
 * The last one to fire wins, and by then the layout is settled.
 *
 * `resolveTarget` is a function because the two callers resolve differently: the
 * TOC needs a heading in the document the router has just swapped in, while the
 * evidence key already holds the element it opened.
 */
export function reanchorAfterSettle({ container, resolveTarget, windowRef }) {
  const flow = container?.querySelector?.('.disclosure-flow');
  const jump = () => {
    resolveTarget()?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };
  let settled = false;
  const settle = (run) => {
    if (settled) {
      return;
    }
    settled = true;
    run();
  };

  if (!flow) {
    windowRef.requestAnimationFrame?.(() => settle(jump));
    return;
  }
  /*
   * A transition event is only ours when it came from the flow itself. A
   * descendant's `transitionend` bubbles up here and would end the window early,
   * so the target is checked.
   *
   * This guard is deliberately NOT shared with the frame and timeout paths below.
   * `requestAnimationFrame` invokes its callback with a `DOMHighResTimeStamp` — a
   * number — so one shared callback would read `event.target` off a number, get
   * `undefined`, and reject its own next-frame path in every real browser. The test
   * fixture used to call the frame with no argument at all, which made the shared
   * version look correct: the path was dead in production and green in CI.
   */
  const settleFromEvent = (event) => {
    if (event?.target !== flow) {
      return;
    }
    settle(jump);
  };
  flow.addEventListener?.('transitionend', settleFromEvent);
  flow.addEventListener?.('transitioncancel', settleFromEvent);
  // Reduced motion, or a panel already at its final size: the change is
  // effectively instant and no transition fires. Under
  // `prefers-reduced-motion: reduce` the row is `transition: none`, so this and the
  // timeout below are the ONLY paths that run.
  windowRef.requestAnimationFrame?.(() => settle(jump));
  // A row that neither animates nor emits an event must not leave the reader
  // mis-aimed, so the re-anchor also happens unconditionally past the transition
  // duration.
  windowRef.setTimeout?.(() => settle(jump), REANCHOR_FALLBACK_MS);
}
