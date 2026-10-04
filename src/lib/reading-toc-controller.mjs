import { findById } from './dom.mjs';
import { readDocumentHeight, resolveActiveId } from './reading-toc-resolve.mjs';
import { observeSections } from './reading-toc-observe.mjs';
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

/*
 * Skip a write that would not change anything.
 *
 * The server already renders every anchor `data-active="false"` with no `aria-current`
 * (`ReadingToc.astro:66`, `:129`), and `resolveActiveId` returns `entries[0].id` at the
 * top of the document — so a cold load, which is every cold load, asked 82 of its 84
 * anchors to be told what they already said. Each anchor carries `transition-colors`
 * and six `data-[active=true]:*` variants (`ReadingToc.astro:25-31`), so a redundant
 * write still dirties style on an element the engine then has to re-evaluate.
 * Comparing before writing is what `applyAttribute` in `reading-prefs-store.mjs:103`
 * already does. `active` is a BOOLEAN, not the `data-active` value: `'false'` is truthy.
 */
function writeActiveState(anchor, active) {
  const value = active ? 'true' : 'false';
  if (anchor.dataset.active !== value) {
    anchor.dataset.active = value;
  }
  if (!active && anchor.getAttribute?.('aria-current') !== null) {
    anchor.removeAttribute?.('aria-current');
  } else if (active && anchor.getAttribute?.('aria-current') !== 'location') {
    anchor.setAttribute?.('aria-current', 'location');
  }
}

function setActiveState(entries, id, currentLabel, cache) {
  if (cache?.lastId === id) {
    return;
  }
  if (cache) {
    cache.lastId = id;
  }
  for (const entry of entries) {
    const active = entry.id === id;
    for (const anchor of entry.links) {
      writeActiveState(anchor, active);
    }
  }
  const current = entries.find((entry) => entry.id === id);
  const text = current?.links[0]?.lastElementChild?.textContent;
  if (currentLabel && text) {
    currentLabel.textContent = text;
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
      initialId = resolveActiveId(entries, windowRef, readDocumentHeight(documentRef));
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
