/*
 * Reading a recorded route swap.
 *
 * The arithmetic that turns a recorded trace into the two ladders' properties, kept out
 * of the spec files so that both of them assert rather than compute. `route-transition.spec.mjs`
 * is about choreography and `route-transition-compositing.spec.mjs` is about compositing;
 * the shared vocabulary of "when did this half start" and "how far apart are those two
 * moments" belongs to neither.
 *
 * Everything here is pure. It takes a recorded trace and returns numbers, which is what
 * makes it checkable by reading rather than by running a browser.
 */
import { EXIT_ORDER, delays, half } from './zone-swap.mjs';

export { EXIT_ORDER };

/**
 * The float tolerance a ladder comparison needs.
 *
 * Delays come back from the browser as floats and the arrival ladder is built with nested
 * `calc()`, so the running head lands on 669.9999999999999 rather than 670 and a 45ms step
 * measures as 44.9999999999999. A raw `>` is then false for a ladder that is exactly
 * right, which is the worst possible failure: it reports a broken choreography for a
 * correct one.
 *
 * 1ms is three orders of magnitude below the smallest step the stylesheet can express
 * (45ms) and well above the accumulated float error, so it forgives arithmetic noise
 * while still catching two pieces that genuinely share a step.
 */
const TOLERANCE = 1;

/** Whether a list of delays strictly rises, step by step. */
export const strictlyAscending = (values) =>
  values.every((value, index) => index === 0 || value > values[index - 1] + TOLERANCE);

/** When each zone's half began, in `EXIT_ORDER`. */
export const startTimes = (entries, side) =>
  EXIT_ORDER.map((zone) => Math.min(...delays(entries, side, zone)));

/**
 * The two moments the whole choreography hangs on.
 *
 * `lastExitEnds` is when the LAST departing piece is gone — the foot of the page, since
 * the zones leave top-down — and `firstArrival` is when the first arriving piece begins.
 * Everything about the dead beat is the distance between them, and it is exposed as its
 * own `gap` so no caller has to remember to subtract.
 *
 * Both are computed across `EXIT_ORDER` rather than from a single zone deliberately. The
 * ladders run in opposite orders, so pairing the last departure against the first arrival
 * is the only pairing that gates anything: a check against the running head alone would
 * pass no matter how far the two ends of the swap had drifted apart.
 */
export const ladderBounds = (entries, duration) => {
  const lastExitEnds = Math.max(...startTimes(entries, 'old')) + duration;
  const firstArrival = Math.min(...startTimes(entries, 'new'));

  return { lastExitEnds, firstArrival, gap: firstArrival - lastExitEnds };
};

/** Whether every zone on a section page contributed both halves to the trace. */
export const capturedBothHalves = (entries) =>
  EXIT_ORDER.every(
    (zone) => half(entries, 'new', zone).length > 0 && half(entries, 'old', zone).length > 0,
  );

/** The zone halves missing from the trace, for a failure message that names them. */
export const missingHalves = (entries) => {
  const missing = [];

  for (const zone of EXIT_ORDER) {
    for (const side of ['new', 'old']) {
      if (half(entries, side, zone).length === 0) {
        missing.push(`${side}(${zone})`);
      }
    }
  }

  return missing;
};
