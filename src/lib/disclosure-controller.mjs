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

/*
 * Close a disclosure that is already open, on the same animated path a click on
 * its own summary takes — so the row collapses, the padding releases and the
 * `transitionend` finalisation all still happen, and whatever is reading
 * `data-disclosure-closing` (the scroll re-anchors) sees a close rather than a
 * disappearance.
 *
 * This exists for the dismissal rules in `dropdown-dismiss.mjs`, which close a
 * panel the reader did not click the trigger of. Those cannot just set
 * `details.open = false`: that skips the row animation and the padding release
 * entirely, so a panel dismissed by an outside click would leave the padding it
 * opened with, and `waitForDisclosureClosed` would never see `closing === false`
 * because `closing` was never set.
 *
 * Unlike the click path this does NOT treat a close already in flight as a
 * cancel. A cancel is a reader changing their mind about a control they can see;
 * a dismissal arriving while the panel is already folding away is redundant, and
 * honouring it would leave the panel open because the trigger's click would then
 * read as "second click while closing".
 */
const createCloseRequester = (state) => (details) => {
  if (!details || details.open !== true || state.isClosing(details)) {
    return false;
  }
  const flow = findFlow(details);
  if (!flow) {
    return false;
  }
  state.begin(details, flow);
  return true;
};

/*
 * The three document handlers, built once per bind.
 *
 * Split out of `bindDisclosureController` so the behaviour is readable in one pass:
 * a click on a DIRECT summary of an open `<details>` that has a flow is a close, a
 * `grid-template-rows` transition ending is that close finishing, and a swap
 * abandons whatever is pending. The listeners are registered here rather than at
 * the call site so there is one place that decides what this module listens to.
 */
const createHandlers = (documentRef, windowRef, state) => {
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

  return { onBeforeSwap, onClick, onTransitionEnd };
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
  const { onBeforeSwap, onClick, onTransitionEnd } = createHandlers(documentRef, windowRef, state);

  const controller = {
    beforeSwap: onBeforeSwap,
    click: onClick,
    requestClose: createCloseRequester(state),
    transitionEnd: onTransitionEnd,
  };
  setDocumentController(documentRef, controller);
  return controller;
}

/**
 * Ask the bound disclosure controller to close `details`, animated.
 *
 * Returns `true` when a close was started, `false` when there was nothing to close
 * — no controller bound, not a `<details>`, not open, no `.disclosure-flow`, or a
 * close already in flight.
 *
 * Falls back to closing natively when the controller is not bound, because a
 * dismissal rule that does nothing when the module it delegates to is absent is
 * worse than a dismissal without animation: the reader's pointer went somewhere
 * else and the panel stayed up.
 */
export function requestDisclosureClose(details, documentRef) {
  const controller = getDocumentController(documentRef ?? globalThis.document);
  if (controller?.requestClose?.(details)) {
    return true;
  }
  if (controller || details?.open !== true) {
    return false;
  }
  details.open = false;
  return true;
}
