import {
  positionChanged,
  positionOf,
  resolveActiveId,
  trackDocumentHeight,
} from './reading-toc-resolve.mjs';

/*
 * HOW THE SPY IS DRIVEN, as distinct from what it resolves
 * (`reading-toc-resolve.mjs`) or what the anchors show (`reading-toc-controller.mjs`).
 */

/*
 * A passive, rAF-coalesced scroll driver that PARKS on `scrollend`.
 *
 * Parked means an event whose position has not moved since the scroll ended queues
 * nothing at all — not a frame that then discovers there is nothing to do. A queued
 * frame is work the browser still has to schedule, and after a smooth scroll there is
 * a tail of events that carry no new information. `hasMoved` is how the caller asks
 * whether this one does, because the position it compares against is the same one the
 * scan uses to decide whether to run at all.
 */
function createScrollDriver(windowRef, sync, hasMoved) {
  let frame = null;
  let settled = false;
  const onScroll = () => {
    if (frame !== null) {
      return;
    }
    if (settled && !hasMoved()) {
      return;
    }
    settled = false;
    frame = windowRef?.requestAnimationFrame?.(() => {
      frame = null;
      sync();
    });
  };

  windowRef?.addEventListener?.('scroll', onScroll, { passive: true });
  windowRef?.addEventListener?.('scrollend', () => {
    settled = true;
  });

  return {
    wake() {
      settled = false;
    },
    dispose() {
      windowRef?.removeEventListener?.('scroll', onScroll);
      if (frame !== null) {
        windowRef?.cancelAnimationFrame?.(frame);
      }
    },
  };
}

/*
 * Recompute on every scroll, coalesced to one read per frame. The observer is a
 * second trigger, for content-driven reflows.
 *
 * TWO costs this removes, both of which scale with the LENGTH of a scroll rather
 * than with the amount of work the spy has to do.
 *
 * The document height was read on every frame. `scrollHeight` forces a full style
 * recalc and layout of the document to answer, so the guard meant to skip the scan
 * could not skip the read it performed to decide — and it never skipped anything
 * during a scroll anyway, because it also compared `scrollY`, which changes on every
 * frame by definition. A scroll cannot change the document height; content reflowing
 * can, and the observer firing is the report of that. So the height is read once and
 * refreshed when the observer says the content moved.
 *
 * And there was no `scrollend`. A click on one of the 38 in-page outline anchors
 * becomes a browser-driven smooth scroll lasting hundreds of milliseconds, and the
 * rAF loop measured every heading on every frame of it although the answer only
 * changes at a heading boundary.
 */
export function observeSections(entries, onActive, ObserverRef, windowRef, documentRef) {
  const height = trackDocumentHeight(documentRef);
  let lastPosition = null;
  const sync = () => {
    const position = positionOf(windowRef);
    if (!positionChanged(lastPosition, position)) {
      return;
    }
    lastPosition = position;
    const id = resolveActiveId(entries, windowRef, height.read);
    if (id) {
      onActive(id);
    }
  };
  const driver = createScrollDriver(windowRef, sync, () => {
    return positionChanged(lastPosition, positionOf(windowRef));
  });

  let observer = null;
  if (typeof ObserverRef === 'function') {
    const onObserve = () => {
      /* The content moved under us, so the cached height may be stale. */
      height.refresh();
      driver.wake();
      sync();
    };
    observer = new ObserverRef(onObserve, {
      rootMargin: '-15% 0px -65% 0px',
      threshold: 0,
    });
    for (const entry of entries) {
      observer.observe(entry.section);
    }
  }
  return {
    disconnect() {
      driver.dispose();
      observer?.disconnect();
    },
  };
}
