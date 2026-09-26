export const CLOSING_ATTRIBUTE = 'data-disclosure-closing';
export const CLOSE_FALLBACK_MS = 400;
export const FLOW_CLASS = 'disclosure-flow';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const GRID_ROWS_PROPERTY = 'grid-template-rows';
const DISCLOSURE_CONTROLLER_KEY = Symbol.for('guidebook.disclosure-controller');

const getTimerFunctions = (timer, windowRef, dependencies) => {
  const candidate = timer ?? dependencies;
  const sources = [candidate, windowRef];
  const timeoutSource =
    sources.find((source) => typeof source?.setTimeout === 'function') ?? globalThis;
  const clearSource =
    sources.find((source) => typeof source?.clearTimeout === 'function') ?? globalThis;

  return {
    clearTimeout: (id) => clearSource.clearTimeout(id),
    setTimeout: (callback, delay) => timeoutSource.setTimeout(callback, delay),
  };
};

const prefersReducedMotion = (windowRef) =>
  windowRef?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;

const findDisclosureDetails = (target) => {
  const summary = target?.closest?.('summary') ?? null;
  const details = summary?.closest?.('details') ?? null;
  return summary && details && summary.parentElement === details ? details : null;
};

const findFlow = (details) => {
  for (const child of details?.children ?? []) {
    if (child?.classList?.contains(FLOW_CLASS)) {
      return child;
    }
  }
  return null;
};

const getDocumentController = (documentRef) => documentRef?.[DISCLOSURE_CONTROLLER_KEY] ?? null;

const setDocumentController = (documentRef, controller) => {
  try {
    documentRef[DISCLOSURE_CONTROLLER_KEY] = controller;
  } catch {
    return false;
  }
  return true;
};

const createClosingState = (timers) => {
  let pending = null;

  const clear = (close) => {
    const active = pending;
    if (!active) {
      return false;
    }
    pending = null;
    timers.clearTimeout(active.fallbackId);
    active.details.removeAttribute?.(CLOSING_ATTRIBUTE);
    if (close) {
      active.details.open = false;
    }
    return true;
  };

  const finalize = (active) => (pending === active ? clear(true) : false);

  return {
    begin(details, flow) {
      clear(true);
      const active = { details, flow, fallbackId: undefined };
      pending = active;
      details.setAttribute?.(CLOSING_ATTRIBUTE, '');
      active.fallbackId = timers.setTimeout(() => {
        finalize(active);
      }, CLOSE_FALLBACK_MS);
    },
    beforeSwap() {
      return clear(true);
    },
    cancel() {
      return clear(false);
    },
    finish(flow) {
      return pending?.flow === flow ? clear(true) : false;
    },
    isClosing(details) {
      return pending?.details === details;
    },
    pendingFlow() {
      return pending?.flow ?? null;
    },
  };
};

export function bindDisclosureController(dependencies = {}) {
  const isDocument = typeof dependencies?.querySelector === 'function';
  const documentRef = isDocument ? dependencies : (dependencies.document ?? globalThis.document);
  const windowRef =
    dependencies.window ??
    (isDocument ? dependencies.defaultView : documentRef?.defaultView) ??
    globalThis.window;
  const persistent = getDocumentController(documentRef);
  if (persistent) {
    return persistent;
  }
  if (!documentRef) {
    return { beforeSwap() {} };
  }

  const state = createClosingState(getTimerFunctions(dependencies.timers, windowRef, dependencies));
  const onClick = (event) => {
    if (prefersReducedMotion(windowRef)) {
      return;
    }
    const details = findDisclosureDetails(event?.target);
    if (!details || details.open !== true) {
      return;
    }
    const flow = findFlow(details);
    if (!flow) {
      return;
    }
    event?.preventDefault?.();
    if (state.isClosing(details)) {
      state.cancel();
      return;
    }
    state.begin(details, flow);
  };
  const onTransitionEnd = (event) => {
    if (event?.propertyName === GRID_ROWS_PROPERTY) {
      state.finish(event?.target);
    }
  };
  const onBeforeSwap = () => state.beforeSwap();

  documentRef.addEventListener?.('click', onClick);
  documentRef.addEventListener?.('transitionend', onTransitionEnd);
  documentRef.addEventListener?.('astro:before-swap', onBeforeSwap);

  const controller = { beforeSwap: onBeforeSwap, click: onClick, transitionEnd: onTransitionEnd };
  setDocumentController(documentRef, controller);
  return controller;
}
