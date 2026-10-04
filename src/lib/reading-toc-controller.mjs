import { findById } from './dom.mjs';
import { closeMobileOnJump } from './reading-toc-jump.mjs';

/*
 * ONE ENTRY PER HEADING, holding every anchor that points at it.
 *
 * `ReadingToc.astro` renders each heading twice — a desktop rail (`ReadingToc.astro:36`,
 * `hidden lg:block`) and a mobile outline (`ReadingToc.astro:79`, `lg:hidden`) — and
 * both anchors carry `data-toc-link={h.id}`. Minting an entry per ANCHOR therefore
 * doubled everything that costs geometry: on a 42-heading page the band scan read
 * 84 rects instead of 42, the IntersectionObserver took 84 targets instead of 42, and
 * each duplicate captured its own closure in `closeMobileOnJump`.
 *
 * `links` is kept on the entry because the two anchors are NOT redundant: they are
 * `display:none` at complementary breakpoints, so both have to receive the active
 * state and both need a click handler. What is per-heading is the measurement, the
 * observation and the closure; what stays per-anchor is the write and the
 * registration.
 */
function collectEntries(documentRef) {
  const anchors = Array.from(documentRef?.querySelectorAll?.('[data-toc-link]') ?? []);
  const byId = new Map();
  for (const anchor of anchors) {
    const id = anchor.dataset?.tocLink;
    if (!id) {
      continue;
    }
    const existing = byId.get(id);
    if (existing) {
      existing.links.push(anchor);
      continue;
    }
    const section = findById(documentRef, id);
    if (section) {
      byId.set(id, { id, links: [anchor], section });
    }
  }
  return [...byId.values()];
}

function setActiveState(entries, id, currentLabel, cache) {
  if (cache?.lastId === id) {
    return;
  }
  if (cache) {
    cache.lastId = id;
  }
  for (const entry of entries) {
    const match = entry.id === id;
    for (const anchor of entry.links) {
      anchor.dataset.active = match ? 'true' : 'false';
      if (match) {
        anchor.setAttribute?.('aria-current', 'location');
      } else {
        anchor.removeAttribute?.('aria-current');
      }
    }
  }
  const active = entries.find((entry) => entry.id === id);
  const text = active?.links[0]?.lastElementChild?.textContent;
  if (currentLabel && text) {
    currentLabel.textContent = text;
  }
}

/*
 * Resolve which section is current from geometry alone. Calling it on scroll
 * (coalesced to one frame) fixes the old IntersectionObserver-driven spy,
 * which lagged a programmatic scroll by a frame and, at the bottom of a page
 * whose last heading sits below the band, silently kept the FIRST section
 * marked current. An explicit page-bottom case: at the end of the document
 * the last section is the current one, because that is the text being read.
 */
function resolveActiveId(entries, windowRef, documentRef) {
  if (entries.length === 0) {
    return null;
  }
  const viewportHeight = windowRef?.innerHeight ?? 0;
  const scrollTop = windowRef?.scrollY ?? 0;
  const maxScroll = Math.max(0, (documentRef?.documentElement?.scrollHeight ?? 0) - viewportHeight);
  if (maxScroll > 0 && maxScroll - scrollTop <= 2) {
    return entries.at(-1).id;
  }
  // The same reasoning at the other end: before the first heading the reader is
  // at the start of the document, so the first section is the current one even
  // though it is nowhere near the band.
  if (scrollTop <= 2) {
    return entries[0].id;
  }
  const bandTop = viewportHeight * 0.15;
  const bandBottom = viewportHeight * 0.35;
  let inBand;
  let lastAbove;
  for (const entry of entries) {
    const rect = entry.section.getBoundingClientRect?.();
    if (!rect) {
      continue;
    }
    if (inBand === undefined && rect.top < bandBottom && rect.bottom > bandTop) {
      inBand = entry.id;
    }
    if (rect.top <= bandTop) {
      lastAbove = entry;
    }
  }
  // Nothing in the band and nothing above it: the reader is above the first
  // heading, so no section is current. Returning an id here would name a
  // section that has not been reached.
  return inBand ?? lastAbove?.id ?? null;
}

function inputsChanged(lastInputs, scrollY, innerHeight, scrollHeight) {
  return (
    lastInputs === null ||
    lastInputs.scrollY !== scrollY ||
    lastInputs.innerHeight !== innerHeight ||
    lastInputs.scrollHeight !== scrollHeight
  );
}

/*
 * Recompute on every scroll, coalesced to one read per frame. A passive,
 * rAF-throttled scroll handler is the standard way to keep a scroll-spy
 * honest; the observer is a second trigger for content-driven reflows, and
 * both skip the geometry scan when nothing that feeds it changed.
 */
function observeSections(entries, onActive, ObserverRef, windowRef, documentRef) {
  let frame = null;
  let lastInputs = null;
  const sync = () => {
    const scrollY = windowRef?.scrollY ?? 0;
    const innerHeight = windowRef?.innerHeight ?? 0;
    const scrollHeight = documentRef?.documentElement?.scrollHeight ?? 0;
    if (!inputsChanged(lastInputs, scrollY, innerHeight, scrollHeight)) {
      return;
    }
    lastInputs = { scrollY, innerHeight, scrollHeight };
    const id = resolveActiveId(entries, windowRef, documentRef);
    if (id) {
      onActive(id);
    }
  };
  const onScroll = () => {
    if (frame !== null) {
      return;
    }
    frame = windowRef?.requestAnimationFrame?.(() => {
      frame = null;
      sync();
    });
  };
  windowRef?.addEventListener?.('scroll', onScroll, { passive: true });

  let observer = null;
  if (typeof ObserverRef === 'function') {
    observer = new ObserverRef(sync, {
      rootMargin: '-15% 0px -65% 0px',
      threshold: 0,
    });
    for (const entry of entries) {
      observer.observe(entry.section);
    }
  }
  return {
    disconnect() {
      windowRef?.removeEventListener?.('scroll', onScroll);
      if (frame !== null) {
        windowRef?.cancelAnimationFrame?.(frame);
      }
      observer?.disconnect();
    },
  };
}

/*
 * A hash that names no heading must not blank the whole list, and a
 * percent-encoded fragment has to be decoded before it can match an id.
 */
function decodeHashTarget(hash) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

function createPageLoad({
  documentRef,
  windowRef,
  ObserverRef,
  AbortControllerRef,
  state,
  teardown,
}) {
  return () => {
    teardown();
    const entries = collectEntries(documentRef);
    /* Fresh per page: the last active id belongs to the document that was
       just swapped out. */
    const activeCache = { lastId: null };
    if (entries.length === 0) {
      return;
    }
    const currentLabel = documentRef.querySelector?.('[data-toc-mobile-current]');
    const mobile = documentRef.querySelector?.('[data-toc-mobile]');
    const hash = windowRef?.location?.hash ?? '';
    let initialId;
    if (hash) {
      const target = decodeHashTarget(hash);
      initialId = entries.some((entry) => entry.id === target) ? target : undefined;
    } else {
      initialId = resolveActiveId(entries, windowRef, documentRef);
    }
    if (initialId) {
      setActiveState(entries, initialId, currentLabel, activeCache);
    }
    state.observer = observeSections(
      entries,
      (id) => setActiveState(entries, id, currentLabel, activeCache),
      ObserverRef,
      windowRef,
      documentRef,
    );
    state.linkController =
      typeof AbortControllerRef === 'function' ? new AbortControllerRef() : null;
    state.removeJumpHandlers = closeMobileOnJump(
      entries,
      mobile,
      state.linkController?.signal,
      windowRef,
      documentRef,
    );
  };
}

const controllers = new WeakMap();

export function createReadingTocController(
  dependencies = {},
  windowDependency,
  observerDependency,
  abortDependency,
) {
  const documentRef = dependencies.document ?? globalThis.document;
  const windowRef = dependencies.window ?? windowDependency ?? globalThis.window;
  const ObserverRef =
    dependencies.IntersectionObserver ?? observerDependency ?? globalThis.IntersectionObserver;
  const AbortControllerRef =
    dependencies.AbortController ?? abortDependency ?? globalThis.AbortController;
  const existing = documentRef ? controllers.get(documentRef) : undefined;
  if (existing) {
    return existing;
  }

  const state = { observer: null, linkController: null, removeJumpHandlers: null };
  const teardown = () => {
    state.observer?.disconnect();
    state.observer = null;
    state.removeJumpHandlers?.();
    state.removeJumpHandlers = null;
    state.linkController?.abort();
    state.linkController = null;
  };
  const pageLoad = createPageLoad({
    documentRef,
    windowRef,
    ObserverRef,
    AbortControllerRef,
    state,
    teardown,
  });

  documentRef?.addEventListener?.('astro:before-swap', teardown);
  documentRef?.addEventListener?.('astro:page-load', pageLoad);
  const controller = { beforeSwap: teardown, pageLoad };
  if (documentRef) {
    controllers.set(documentRef, controller);
  }
  return controller;
}
