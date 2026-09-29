/*
 * Assertions about a recorded route swap.
 *
 * The vocabulary both transition specs assert with, in one place so neither has to carry
 * the rationale inline. They live here rather than in the spec files for a specific
 * reason: `max-lines-per-function` counts the comments, and the reasoning is most of the
 * value — a spec that has to compress its own explanation to fit a line budget is a spec
 * whose explanation gets cut first.
 *
 * Everything here takes a recorded trace from `recordSwap` and asserts something about
 * it, and every message names the zone and the property. They are pure over the trace, so
 * a failure means the choreography is wrong rather than that the harness is.
 */
import { expect } from '@playwright/test';
import { EXIT_ORDER, half } from './zone-swap.mjs';
import { missingHalves, startTimes, strictlyAscending } from './ladder.mjs';

/**
 * Every edge, with the direction it leaves in: `+1` is rightward, `-1` leftward.
 *
 * The rail sits left of the reading column and the next pager cell sits right of the
 * previous one, so the three do not all leave the same way. This divergence is the only
 * thing that stops the swap reading as a uniform dissolve, which is why it is asserted on
 * both halves and on both navigation kinds.
 */
const EDGES = [
  ['rail', -1],
  ['pager-prev', -1],
  ['pager-next', 1],
];

/** One edge, one side: travels the full distance on X, in the expected direction. */
export function expectEdgeTravels(entries, side, zone, expected) {
  const zoneEntries = half(entries, side, zone);

  expect(zoneEntries, `the ${side} half lost the ${zone} zone`).not.toEqual([]);
  for (const entry of zoneEntries) {
    expect(entry.axis, `${zone} does not travel on the horizontal axis`).toBe('X');
    expect(entry.travel, `${zone} does not travel ${expected}px`).toBe(String(expected));
  }
}

/**
 * Every edge travels, and the named centre zones hold still.
 *
 * Shared by both variants and applied to both halves, because the divergence is what they
 * have in common: an edge leaves along its own axis and returns along the same one. What
 * differs between a jump and a pager hop is the centre's arrival, which is vertical rather
 * than absent — so the centre goes through here on the way out and is asserted separately
 * on the way in.
 */
export function expectDividedEdges(entries, side, distance, centres = []) {
  for (const [zone, direction] of EDGES) {
    expectEdgeTravels(entries, side, zone, direction * distance);
  }

  for (const zone of centres) {
    for (const entry of half(entries, side, zone)) {
      expect(entry.axis, `${zone} travels, and must not`).toBeNull();
    }
  }
}

/**
 * The departure's order and its overlap, in one claim.
 *
 * Ascending is what makes the page come apart in page order. The overlap is what keeps it
 * coming apart rather than vanishing between two states: consecutive pieces start before
 * the previous one has finished, so something is always still on its way out.
 *
 * The overlap comparison is strict and the ascending one is not. A 45ms step against a
 * 240ms piece leaves 195ms of margin, which no float error could close — whereas the
 * ladder values themselves arrive as floats from nested `calc()`, which is the case
 * `strictlyAscending` carries a tolerance for.
 */
export function expectOrderedOverlap(entries, duration, side = 'old') {
  const start = startTimes(entries, side);
  const order = EXIT_ORDER.map((zone, i) => `${zone}@${start[i]}`).join(' ');

  expect(strictlyAscending(start), `${side} is not in page order: ${order}`).toBe(true);
  expect(start[0], 'the running head does not leave first').toBe(0);

  for (let i = 1; i < EXIT_ORDER.length; i += 1) {
    expect(
      start[i],
      `${EXIT_ORDER[i]} starts after ${EXIT_ORDER[i - 1]} has gone, so the page vanishes`,
    ).toBeLessThan(start[i - 1] + duration);
  }
}

/**
 * The arrival is the exact reverse of the departure.
 *
 * The whole effect, and the reason the two ladders are separate rather than one loop with
 * a sign. A reader who watches the running head go first and the pager cell go last sees a
 * page disassemble and then build itself back up from the bottom. Forward order would read
 * as two pages sliding past one another, which is a transition between documents; reverse
 * order reads as one document opening and closing.
 *
 * Read bottom-to-top, so the delays RISE: the pager cell at the foot of the page arrives
 * first and the running head at the top arrives last. `EXIT_ORDER` read top-to-bottom also
 * has rising delays. The difference is which zone owns each step, and that is the reverse
 * ordering.
 */
export function expectReversedArrival(entries) {
  const arrivals = EXIT_ORDER.toReversed();

  for (const zone of arrivals) {
    expect(half(entries, 'new', zone), `the arriving half of ${zone} was not captured`).not.toEqual(
      [],
    );
  }

  const start = startTimes(entries, 'new').toReversed();

  expect(
    strictlyAscending(start),
    `arrival is not bottom-to-top: ${arrivals.map((zone, i) => `${zone}@${start[i]}`).join(' ')}`,
  ).toBe(true);
}

/**
 * One half's opacity runs the way this side's half has to run.
 *
 * The arrival withholds itself — starts at zero and ends opaque — and the departure
 * starts opaque and clears to nothing. Both directions are asserted because the dead beat
 * depends on them together: the departure ending at `0` and the arrival starting at `0` is
 * the only reason anything is empty in the middle.
 */
export function expectHalvesFade(entries, side, [from, to], complaint) {
  for (const zone of EXIT_ORDER) {
    for (const entry of half(entries, side, zone)) {
      expect(entry.opacity.at(0), `${zone} does not start at ${from}`).toBe(from);
      expect(entry.opacity.at(-1), complaint(zone)).toBe(to);
    }
  }
}

export const expectEveryZoneWithholdsThenArrives = (entries) =>
  expectHalvesFade(entries, 'new', ['0', '1'], (zone) => `${zone} does not arrive opaque`);

export const expectEveryZoneClears = (entries) =>
  expectHalvesFade(
    entries,
    'old',
    ['1', '0'],
    (zone) => `${zone} never clears, so the page is never blank`,
  );

/** The recorder saw every half of every zone, on either kind of navigation. */
export function expectBothHalvesCaptured(entries) {
  expect(
    missingHalves(entries),
    'these halves are missing, so no assertion about them can hold',
  ).toEqual([]);
}

/**
 * Two navigations genuinely differ.
 *
 * Both sides are checked non-empty first, because `not.toEqual` on two empty arrays
 * passes — which is exactly what happened while the two variants were identical. A
 * comparison that can be satisfied by absence is not a comparison.
 */
export function expectDifferentNavigations(a, b, side, zone, { compare = 'name' } = {}) {
  const read = (entries, entry) => (compare === 'name' ? entry.name : entry.opacity.at(-1));
  const named = (entries) => half(entries, side, zone).map((entry) => read(entries, entry));

  expect(named(a), `the first ${side}(${zone}) was not recorded`).not.toEqual([]);
  expect(named(b), `the second ${side}(${zone}) was not recorded`).not.toEqual([]);
  expect(named(a), 'the two navigations ran the same choreography').not.toEqual(named(b));
}
