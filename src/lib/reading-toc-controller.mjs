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

function setActiveState(entries, id, currentLabel) {
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
 * Resolve which section is current from geometry alone.
 *
 * The previous implementation drove the highlight entirely from
 * IntersectionObserver callbacks. Two problems followed from that:
 *
 * 1. The callback is asynchronous. After a programmatic or fast scroll the
 *    highlight lagged the scroll position by a frame or more, so the TOC could
 *    name a section the reader had already left.
 * 2. The observer only fires when the SET of intersecting elements changes. At
 *    the bottom of a page whose last heading sits below the `-65%` band, the
 *    previous heading leaves the band and nothing enters it — the callback runs
 *    with nothing visible and no id to apply, so the highlight silently stayed
 *    on whatever it was at load time. A reader who scrolled to the end of a
 *    chapter saw the FIRST section marked current.
 *
 * Resolving from geometry and calling it on scroll fixes both, and an explicit
 * page-bottom case states the rule directly: at the end of the document the
 * last section is the current one, because that is the text being read.
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

/*
 * Recompute on every scroll, coalesced to one read per frame. A passive,
 * rAF-throttled scroll handler is the standard way to keep a scroll-spy honest;
 * the observer is kept as a second trigger because it is cheaper than measuring
 * every heading on fast programmatic scrolls.
 */
function observeSections(entries, onActive, ObserverRef, windowRef, documentRef) {
  const sync = () => {
    const id = resolveActiveId(entries, windowRef, documentRef);
    if (id) {
      onActive(id);
    }
  };
  let frame = null;
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

function closeMobileOnJump(entries, mobile, signal, windowRef, documentRef) {
  for (const entry of entries) {
    const options = signal ? { signal } : undefined;
    entry.link.addEventListener?.(
      'click',
      () => {
        if (mobile?.open && windowRef.matchMedia?.('(max-width: 1023px)')?.matches) {
          const id = entry.id;
          mobile.open = false;
          reanchorAfterSettle({
            container: mobile,
            resolveTarget: () => findById(documentRef, id),
            windowRef,
          });
        }
      },
      options,
    );
  }
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
      setActiveState(entries, initialId, currentLabel);
    }
    state.observer = observeSections(
      entries,
      (id) => setActiveState(entries, id, currentLabel),
      ObserverRef,
      windowRef,
      documentRef,
    );
    state.linkController =
      typeof AbortControllerRef === 'function' ? new AbortControllerRef() : null;
    closeMobileOnJump(entries, mobile, state.linkController?.signal, windowRef, documentRef);
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

  const state = { observer: null, linkController: null };
  const teardown = () => {
    state.observer?.disconnect();
    state.observer = null;
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
