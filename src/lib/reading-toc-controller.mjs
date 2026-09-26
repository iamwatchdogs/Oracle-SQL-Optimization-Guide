function escapeId(id) {
  return globalThis.CSS?.escape?.(id) ?? id;
}

function collectEntries(documentRef) {
  const links = Array.from(documentRef?.querySelectorAll?.('[data-toc-link]') ?? []);
  return links.flatMap((link) => {
    const id = link.dataset?.tocLink;
    if (!id) {
      return [];
    }
    const section = documentRef.querySelector?.(`#${escapeId(id)}`);
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
  const text = active?.link.querySelector?.('.truncate, span:last-child')?.textContent;
  if (currentLabel && text) {
    currentLabel.textContent = text;
  }
}

function isAtPageTop(windowRef) {
  return (windowRef?.scrollY ?? windowRef?.pageYOffset ?? 0) <= 2;
}

function observeSections(entries, onActive, ObserverRef) {
  if (typeof ObserverRef !== 'function') {
    return null;
  }
  const observer = new ObserverRef(
    (observedEntries) => {
      const visible = Array.prototype.sort.call(
        [...observedEntries].filter((entry) => entry.isIntersecting),
        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
      );
      const id = visible[0]?.target?.id;
      if (id) {
        onActive(id);
      }
    },
    { rootMargin: '-15% 0px -65% 0px', threshold: 0 },
  );
  for (const entry of entries) {
    observer.observe(entry.section);
  }
  return observer;
}

function closeMobileOnJump(entries, mobile, signal, windowRef) {
  for (const entry of entries) {
    const options = signal ? { signal } : undefined;
    entry.link.addEventListener?.(
      'click',
      () => {
        if (mobile?.open && windowRef.matchMedia?.('(max-width: 1023px)')?.matches) {
          mobile.open = false;
        }
      },
      options,
    );
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
    if (hash) {
      setActiveState(entries, hash.slice(1), currentLabel);
    } else {
      const firstEntry = entries[0];
      const rect = firstEntry.section.getBoundingClientRect();
      const viewportHeight = windowRef.innerHeight;
      const bandTop = viewportHeight * 0.15;
      const bandBottom = viewportHeight * 0.35;
      if (isAtPageTop(windowRef) || (rect.top < bandBottom && rect.bottom > bandTop)) {
        setActiveState(entries, firstEntry.id, currentLabel);
      }
    }
    state.observer = observeSections(
      entries,
      (id) => setActiveState(entries, id, currentLabel),
      ObserverRef,
    );
    state.linkController =
      typeof AbortControllerRef === 'function' ? new AbortControllerRef() : null;
    closeMobileOnJump(entries, mobile, state.linkController?.signal, windowRef);
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
