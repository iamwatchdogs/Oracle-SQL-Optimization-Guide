import { findById } from './dom.mjs';
import { reanchorAfterSettle } from './disclosure-reanchor.mjs';

function collectEntries(documentRef) {
  const links = Array.from(documentRef?.querySelectorAll?.('[data-toc-link]') ?? []);
  return links.flatMap((link) => {
    const id = link.dataset?.tocLink;
    if (!id) {
      return [];
    }
    const section = findById(documentRef, id);
    return section ? [{ id, link, section }] : [];
  });
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
    entry.link.dataset.active = match ? 'true' : 'false';
    if (match) {
      entry.link.setAttribute?.('aria-current', 'location');
    } else {
      entry.link.removeAttribute?.('aria-current');
    }
  }
  const active = entries.find((entry) => entry.id === id);
  const text = active?.link?.lastElementChild?.textContent;
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
 * Returns a disposer.
 *
 * `AbortController` is the tidiest way to unregister 84 listeners at once on the
 * flagship page, but it is a dependency, not a guarantee: when it is unavailable
 * `options` is `undefined` and the listeners had nothing to remove them. The
 * disposers are collected explicitly so `teardown` works either way — otherwise
 * every Astro navigation stacked another 84 handlers on a persistent panel, each
 * closing the mobile disclosure and re-anchoring against a stale document.
 */
function closeMobileOnJump(entries, mobile, signal, windowRef, documentRef) {
  const handlers = [];

  for (const entry of entries) {
    const handler = () => {
      if (mobile?.open && windowRef.matchMedia?.('(max-width: 1023px)')?.matches) {
        const id = entry.id;
        mobile.open = false;
        reanchorAfterSettle({
          container: mobile,
          resolveTarget: () => findById(documentRef, id),
          windowRef,
        });
      }
    };
    entry.link.addEventListener?.('click', handler, signal ? { signal } : undefined);
    handlers.push([entry.link, handler]);
  }

  return () => {
    for (const [link, handler] of handlers) {
      link.removeEventListener?.('click', handler);
    }
    handlers.length = 0;
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
