/*
 * Recording a route swap.
 *
 * The recorder and the zone helpers shared by `route-transition.spec.mjs` and
 * `route-transition-compositing.spec.mjs`.
 *
 * `recordSwap` drives a real navigation and returns every view-transition animation
 * the browser actually ran. The specs assert on those resolved animations rather
 * than on the stylesheet's source text, because three separate defects in this
 * feature were each invisible to a source-level check: an ancestor-qualified zone
 * rule that parses and never applies, a router that deletes the variant attribute
 * after it has been written, and additive blending that a stagger cannot composite.
 *
 * It also normalises one engine difference, because a spec that reads a keyframe's
 * `transform` has to cope with three serialisations of the same authored value.
 * `getKeyframes()` returns what the author wrote, and the engines disagree about
 * whether to simplify a `calc()`: for `translateX(calc(-1 * var(--zone-travel)))`
 * with `--zone-travel: 60px`, Chromium and WebKit report `"translateX(-60px)"` and
 * Firefox reports `"translateX(calc(-60px))"`. The rendering is identical in all
 * three — sampled matrices match at every progress value — so the peel belongs here
 * rather than in the stylesheet, where hardcoding the distance would demote
 * `--zone-travel` and `--zone-drop` to values nothing but a test reads.
 */

/*
 * Both of these are declared INSIDE the evaluated body below rather than at module
 * scope, and installed as page globals instead. `page.evaluate` serialises a function
 * body and evaluates it in the page, where module scope does not exist, so a helper
 * declared here could not be closed over. `globalThis.zoneFlatten` and
 * `globalThis.zoneDescribe` are the page-side copy; nothing in Node reads them.
 */

/** Every zone, in the order a jump reads the page: top to bottom. */
export const EXIT_ORDER = ['rh', 'rail', 'body', 'pager-prev', 'pager-next'];

export const PREFACE = '/00-preface/';
export const PROOF = '/00-preface/02-how-to-prove-a-win/';

/** The swap is ~910ms end to end; this covers the tail with room for a slow machine. */
export const SETTLE = 1800;

/**
 * Read the choreography's tokens as the STYLESHEET resolved them, not as they are authored.
 *
 * Every delay in the arrival ladder is a nested `calc()` over three custom properties, so
 * the authored text cannot be read for the resolved value. `getComputedStyle` is the only
 * place the arithmetic has actually happened.
 */

/**
 * Begin recording every view-transition animation the browser runs.
 *
 * The describe step is written out here rather than imported: Playwright serialises
 * `page.evaluate` arguments as JSON, so passing a function in fails outright with
 * "Attempting to serialize unexpected value". The logic has to live at the point of
 * use, beside `document.getAnimations()`, and there is no other side of the boundary
 * it could usefully live on.
 *
 * Two clocks, because one is not enough.
 *
 * A timer alone is unreliable here: this runs alongside the rest of the suite, and
 * on a loaded machine `setInterval` can miss a zone that is only a few hundred ms long — which is a
 * failure of the test rather than of the feature, and it presented as "the rail zone
 * was not captured". `requestAnimationFrame` is driven by the compositor and is in
 * step with the transition itself, so it is the primary clock; the interval is a
 * backstop for the case where rAF is throttled.
 */
/**
 * Install the two pure helpers the recorder needs, as page globals.
 *
 * They cannot be closed over: `page.evaluate` serialises a function body and evaluates it
 * in the page, where module scope does not exist. Declaring them as page globals is the
 * alternative to writing them inline in every callback, and it keeps each `evaluate` body
 * small enough to read — which is the whole point, since these bodies cannot be
 * unit-tested and can only be verified by running them.
 */
const installHelpers = (page) =>
  page.evaluate(() => {
    /* Peel a serialised `calc()` wrapper — see the note on this recorder above. */
    globalThis.zoneFlatten = (transform) => {
      let value = transform ?? '';
      let previous;

      do {
        previous = value;
        value = value.replaceAll(/calc\(([^()]*)\)/gu, '$1');
      } while (value !== previous);

      return value;
    };

    /** Reduce one animation to a recordable entry, or null if it is not ours. */
    globalThis.zoneDescribe = (animation) => {
      const pseudo = animation.effect?.pseudoElement ?? '';
      if (!pseudo.includes('view-transition')) {
        return null;
      }

      const keyframes = animation.effect.getKeyframes();
      if (keyframes.length === 0) {
        return null;
      }

      const offset = keyframes
        .map((keyframe) =>
          /translate([XY])\((-?[\d.]+)px\)/u.exec(globalThis.zoneFlatten(keyframe.transform)),
        )
        .find(Boolean);

      return JSON.stringify({
        zone: pseudo.replace('::view-transition-', ''),
        name: animation.animationName,
        delay: animation.effect.getTiming().delay,
        opacity: keyframes.map((keyframe) => keyframe.opacity),
        axis: offset?.[1] ?? null,
        travel: offset?.[2] ?? null,
      });
    };
  });

export const startRecorder = async (page) => {
  await installHelpers(page);
  await page.evaluate(() => {
    globalThis.zoneTrace = new Set();

    const sweep = () => {
      for (const animation of document.getAnimations()) {
        const entry = globalThis.zoneDescribe(animation);
        if (entry) {
          globalThis.zoneTrace.add(entry);
        }
      }
    };

    let frames = 0;
    const onFrame = () => {
      sweep();
      frames += 1;
      if (frames < 240) {
        globalThis.zoneTraceRaf = requestAnimationFrame(onFrame);
      }
    };

    globalThis.zoneTraceRaf = requestAnimationFrame(onFrame);
    globalThis.zoneTraceId = setInterval(sweep, 8);
  });
};

export const readRecorder = (page) =>
  page.evaluate(() => {
    clearInterval(globalThis.zoneTraceId);
    cancelAnimationFrame(globalThis.zoneTraceRaf);
    return [...globalThis.zoneTrace].map((entry) => JSON.parse(entry));
  });

/**
 * Record a swap.
 *
 * Recording starts BEFORE the navigation and is read after it, because `go` resolves
 * once the new page is live — which is after the swap has already run and the
 * pseudo tree is gone. A recorder installed afterwards sees nothing at all, which
 * reads as "the choreography did not happen" rather than as a broken test.
 */
export async function recordSwap(page, go) {
  await page.goto(PREFACE);
  await page.waitForTimeout(600);
  await startRecorder(page);
  await go();
  await page.waitForTimeout(SETTLE);
  return readRecorder(page);
}

/** `new(rail)` → `['new', 'rail']` */
export const splitZone = (entry) => {
  const match = /^(\w+)\(([^)]*)\)$/u.exec(entry.zone);
  return match ? [match[1], match[2]] : [entry.zone, ''];
};

/** Every recorded animation for one half of one zone, e.g. `half(e, 'old', 'rail')`. */
export const half = (entries, side, zone) =>
  entries.filter((entry) => {
    const [kind, name] = splitZone(entry);
    return kind === side && name === zone;
  });

export const delays = (entries, side, zone) =>
  half(entries, side, zone).map((entry) => entry.delay);

/** The travel distances, resolved from the tokens the stylesheet shipped. */
export const readTravel = (page) =>
  page.evaluate(() => {
    const computed = getComputedStyle(document.documentElement);
    /* The resolved per-piece duration, in ms. A computed animation duration comes back
       in seconds ('0.24s'), so it is scaled rather than parsed raw. */
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--zone-dur').trim();
    return {
      duration: raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000,
      travel: Number.parseFloat(computed.getPropertyValue('--zone-travel')),
      drop: Number.parseFloat(computed.getPropertyValue('--zone-drop')),
    };
  });
