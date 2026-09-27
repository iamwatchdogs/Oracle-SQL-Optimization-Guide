/* Longer than the 280ms `grid-template-rows` transition, so the height test below
 * normally wins and this is the hard bound for a row that never reaches its
 * natural height. Also the wait's own deadline, which is why it is a wall-clock
 * duration and not a frame count: 20 frames is 333ms at 60Hz but only 166ms at
 * 120Hz, which would cut the wait short on a fast display. */
const REANCHOR_FALLBACK_MS = 400;

/*
 * Secondary bound on the height wait, in animation frames.
 *
 * The wall-clock deadline is the real bound. This exists only so a frozen or
 * non-advancing clock cannot spin forever, and is deliberately far above the ~25
 * frames a real 400ms wait needs even at 120Hz.
 */
const SETTLE_FRAME_LIMIT = 60;

/*
 * Sub-pixel tolerance for the height test.
 *
 * `grid-template-rows: 0fr -> 1fr` lands a fraction of a pixel short of the
 * content's natural height, so an exact comparison never fires.
 */
const HEIGHT_EPSILON = 1;

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
 * ## The jump waits on the HEIGHT, not on an event
 *
 * Three paths can say "settled", and trusting any of them was the bug:
 *
 * - `transitionend` on the flow: it fires when the transition for the transitioned
 *   PROPERTY finishes, which is not the same instant as the row having its final
 *   height. Measured in Firefox on the home evidence key, the event landed while
 *   the panel was still growing and the re-anchor aimed 211px above the viewport.
 *   It was not reliable in Chromium either, just rarely wrong enough to show.
 * - the next frame: a frame is ~16ms into a 280ms transition.
 * - a timeout past the transition duration: correct by being late, which is why it
 *   was the only path that never misfired — and too slow to be the primary one.
 *
 * So the events are kept as *triggers* and the jump waits until the row is
 * physically at its end state — the property the caller needs, measured directly
 * rather than inferred from a signal about a CSS property.
 *
 * A first attempt used "the height did not change for two frames", and WebKit's
 * evidence key growth has plateaus inside the transition: its row sat at 336px
 * for several frames while still 6px from its end, so the wait converged early
 * and the re-anchor landed 211px off.
 *
 * ## The end state depends on the direction, and that is not a detail
 *
 * An open row is `grid-template-rows: 1fr`, so its end state is the content's
 * natural height, which `scrollHeight` reports — measured at exactly 342px for the
 * evidence key in both Chromium and WebKit.
 *
 * A COLLAPSING row is `0fr`, and there `scrollHeight` tracks the *current*
 * interpolated height rather than a content height, so `height >= scrollHeight - 1`
 * is true on the very first frame and the wait would converge while the panel was
 * still 700px tall. That is the mobile TOC's case, and getting it wrong left the
 * reader aimed at a heading that was still on its way down the page. So the
 * criterion is chosen from the direction: growing waits to reach the natural
 * height, collapsing waits to reach zero.
 *
 * `resolveTarget` is a function because the two callers resolve differently: the
 * TOC needs a heading in the document the router has just swapped in, while the
 * evidence key already holds the element it opened.
 */
/*
 * The deadline below is the only timer-based guarantee, so it outlives every other
 * path and is released by `jump` rather than by `settle`.
 *
 * The height wait runs on `requestAnimationFrame`, and a frame can be starved
 * indefinitely on a loaded machine — measured here under a load average of 50,
 * where the mobile TOC gate failed every attempt while passing 6 of 6 in
 * isolation. An earlier version cleared this timer the moment a trigger fired,
 * which handed the re-anchor to rAF with nothing left to fall back on, so a
 * starved frame loop meant no jump at all and the reader was never re-aimed.
 * Whichever arrives first wins, and the idempotent `jump` makes the race safe.
 *
 * For the same reason `jump` is guarded on the act rather than on the trigger: the
 * first thing to decide the row is done performs the jump, and everything after
 * that is a no-op.
 *
 * The two kinds of loser are therefore released by different things. The event
 * listeners are released by `settle`: once one has fired it has done its job, and
 * holding two closures for the rest of the wait would leave them on an element the
 * reader is navigating away from. The timer is released by `jump`, because it is
 * the only guarantee the re-anchor has. `removeEventListener` is idempotent, so
 * `jump` disposing of them a second time is harmless.
 */
export function reanchorAfterSettle({ container, resolveTarget, windowRef }) {
  const flow = container?.querySelector?.('.disclosure-flow');

  let jumped = false;
  const release = [];
  const jump = () => {
    if (jumped) {
      return;
    }
    jumped = true;
    for (const dispose of release) {
      dispose();
    }
    release.length = 0;
    resolveTarget()?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };

  const timeoutId = windowRef.setTimeout?.(jump, REANCHOR_FALLBACK_MS);
  if (timeoutId !== undefined) {
    release.push(() => windowRef.clearTimeout?.(timeoutId));
  }

  const releaseEvents = flow ? armFlowEvents(flow, settle) : () => {};
  if (flow) {
    release.push(releaseEvents);
  }

  /* A declaration, so it is hoisted past `releaseEvents` below: arming the
   * listeners needs `settle`, and `settle` needs the disposer that releases them. */
  let settled = false;
  function settle() {
    if (settled) {
      return;
    }
    settled = true;
    releaseEvents();
    whenHeightSettles(flow, windowRef, jump, isClosing(container));
  }

  if (!flow) {
    /* No row to watch, so there is nothing to wait for: the next frame is also the
     * end state. The deadline is already armed, so a starved frame loop is covered
     * either way. */
    windowRef.requestAnimationFrame?.(settle);
    return;
  }

  /* The next-frame path is only armed under reduced motion; see `armNextFrame`. */
  armNextFrame(windowRef, settle);
}

/**
 * Run `jump` once the row has reached its natural height.
 *
 * An open row is `grid-template-rows: 1fr`, so its end state is its content's
 * height, which `scrollHeight` reports. Waiting for that is immune to the
 * plateaus a transition can have partway through, and it converges as soon as the
 * transition does rather than at the deadline.
 *
 * A row with no content has nothing to grow to, so zero height is already final.
 * `REANCHOR_FALLBACK_MS` from arming bounds the wait in wall-clock time, and
 * `SETTLE_FRAME_LIMIT` keeps a stalled clock from spinning.
 */
function whenHeightSettles(flow, windowRef, jump, closing) {
  if (!flow) {
    jump();
    return;
  }

  const reachedEnd = () => {
    const height = flow.getBoundingClientRect?.().height ?? 0;
    if (closing) {
      /* Collapsing: the end state is no row at all. Anything more than a pixel and
       * the panel is still pushing the page around. */
      return height <= HEIGHT_EPSILON;
    }
    const natural = flow.scrollHeight ?? 0;
    if (natural <= 0) {
      /* An open row with no measurable content is already at its end. */
      return height <= HEIGHT_EPSILON;
    }
    return height >= natural - HEIGHT_EPSILON;
  };

  const startedAt = { value: Number.NaN };
  let frame = 0;

  const step = (now) => {
    startedAt.value = Number.isNaN(startedAt.value) ? now : startedAt.value;
    const elapsed = now - startedAt.value;

    if (reachedEnd() || elapsed >= REANCHOR_FALLBACK_MS || frame >= SETTLE_FRAME_LIMIT) {
      jump();
      return;
    }
    frame += 1;
    windowRef.requestAnimationFrame?.(step);
  };

  windowRef.requestAnimationFrame?.(step);
}

/**
 * Arm the transition-event trigger on the flow.
 *
 * The guard is deliberately NOT shared with the frame path: `requestAnimationFrame`
 * invokes its callback with a `DOMHighResTimeStamp` — a number — so one shared
 * callback would read `event.target` off a number, get `undefined`, and reject its
 * own next-frame path in every real browser.
 *
 * A descendant's `transitionend` bubbles up here too, so the target is checked —
 * an event is only ours when the flow itself emitted it.
 */
function armFlowEvents(flow, settle) {
  const fromEvent = (event) => {
    if (event?.target === flow) {
      settle();
    }
  };
  flow.addEventListener?.('transitionend', fromEvent);
  flow.addEventListener?.('transitioncancel', fromEvent);

  return () => {
    flow.removeEventListener?.('transitionend', fromEvent);
    flow.removeEventListener?.('transitioncancel', fromEvent);
  };
}

/**
 * Whether the row is on its way closed, read when a path reports it settled.
 *
 * The mobile TOC removes `open` and the evidence key sets it, so the attribute is
 * the only direction signal the module has. `data-disclosure-closing` is the
 * controller's own flag for the same thing and is checked first, because it is
 * set before `open` is removed.
 */
function isClosing(container) {
  if (container?.dataset?.disclosureClosing !== undefined) {
    return true;
  }
  return container?.hasAttribute?.('open') === false;
}

/**
 * Arm the next-frame trigger, but only under reduced motion.
 *
 * The next frame is the right answer in exactly one case: when the height can never
 * be observed changing, because the row is `transition: none` and is therefore
 * already at its end state. Anywhere else a frame is ~16ms into a 280ms
 * transition, so arming it unconditionally would make it win every race and
 * re-aim the reader while the row is still most of the way to where it is going.
 */
function armNextFrame(windowRef, settle) {
  if (prefersReducedMotion(windowRef)) {
    windowRef.requestAnimationFrame?.(settle);
  }
}

function prefersReducedMotion(windowRef) {
  return windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}
