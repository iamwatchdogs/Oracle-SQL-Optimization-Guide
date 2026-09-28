import { CLOSING_ATTRIBUTE, requestDisclosureClose } from './disclosure-controller.mjs';

export const DROPDOWN_SELECTOR = '[data-dropdown]';
export const DROPDOWN_DISMISS_KEY = Symbol.for('guidebook.dropdown-dismiss');

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const ESCAPE = 'Escape';

const prefersReducedMotion = (windowRef) =>
  windowRef?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;

/**
 * Close a panel through the shared animated path, or natively under reduced
 * motion.
 *
 * Reduced motion is not just "skip the animation" here: the animated path is what
 * keeps `open` true while the row folds away, and nothing else in the project knows
 * the panel is on its way out. A dismissal that skipped the controller under
 * reduced motion would set `open = false` directly, which is correct, and would
 * also mean the scroll re-anchor in `disclosure-reanchor.mjs` — which prefers the
 * controller's closing flag and falls back to `!open` — and the `reading-toc`
 * close-on-jump both see the same settled state. So the native close is safe, and
 * it is what the summary-click path already does.
 */
const dismiss = (details, documentRef, windowRef) => {
  if (!details || details.open !== true) {
    return false;
  }
  if (prefersReducedMotion(windowRef)) {
    details.open = false;
    return true;
  }
  return requestDisclosureClose(details, documentRef) === true;
};

const openDropdowns = (documentRef) => {
  const found = [];
  for (const details of documentRef?.querySelectorAll?.(DROPDOWN_SELECTOR) ?? []) {
    if (details?.open === true) {
      found.push(details);
    }
  }
  return found;
};

const dismissAllExcept = (documentRef, keep, windowRef) => {
  let closed = false;
  for (const details of openDropdowns(documentRef)) {
    if (details === keep) {
      continue;
    }
    closed = dismiss(details, documentRef, windowRef) || closed;
  }
  return closed;
};

/**
 * `pointerdown`, not `click`.
 *
 * A `click` handler cannot tell a reader's click from the browser's synthesised one
 * after a keyboard activation, and by the time `click` fires the browser has
 * already moved focus — so a keyboard-opened panel dismissed on `click` would
 * fight the focus change that opened it. `pointerdown` fires first, sees the state
 * before anything moved, and does not fire at all for keyboard use, which is why
 * `focusout` is a separate rule rather than a fallback.
 */
const onPointerDown = (event, context) => {
  const { documentRef, windowRef } = context;
  const target = event?.target;
  /* Recorded for the focus rules below, before any of the early returns. */
  context.press = target ?? null;
  /* A press that lands on another panel is not an outside press. */
  if (target?.closest?.(DROPDOWN_SELECTOR)) {
    return false;
  }
  /*
   * A press on any summary in the header belongs to the sibling rule in
   * `reading-prefs-controller.mjs`, which closes the other header disclosure
   * synchronously on capture. Two rules racing to close the same panel means one of
   * them closes it natively and the animation is lost, so this stands back.
   */
  if (target?.closest?.('header summary')) {
    return false;
  }
  return dismissAllExcept(documentRef, null, windowRef);
};

const onFocusOut = (event, context) => {
  const { documentRef, windowRef } = context;
  const details = event?.target?.closest?.(DROPDOWN_SELECTOR);
  if (!details) {
    return false;
  }
  /*
   * Focus moving WITHIN the panel is not focus leaving it — the steppers are
   * buttons, and tabbing from the summary to the first one fires this with a
   * `relatedTarget` inside the same panel. `contains` covers that.
   *
   * What is left is the case neither engine names a destination for, and WebKit
   * produces it constantly. WebKit does not move focus to a `<button>` on click,
   * so pressing the first stepper fires `focusout` on the summary with
   * `relatedTarget: null`, and it has already committed the change by the time the
   * event runs — `document.activeElement` is `<body>`, not the summary and not the
   * button. So both readings of "focus left" and "a press inside the panel did
   * nothing" are true at the same instant, and reading it either way is wrong in
   * one engine: it closed the reading preferences on the FIRST preference click in
   * WebKit, which is the one action the panel exists for.
   *
   * The only signal left is the cause. A focus loss whose immediate cause was a
   * press inside the panel is a consequence of that press, not of the reader's
   * attention moving elsewhere, so it does not dismiss. `press` is consumed here so
   * one press can excuse one focus loss and no more, and is cleared whenever focus
   * arrives somewhere, which is what stops a press from excusing a later,
   * unrelated blur. The residual case — a press inside the panel that moved no
   * focus at all, followed much later by a programmatic blur of the same node — is
   * left unexcused, which costs a panel that stays open rather than one that
   * closes under a reader who is still using it.
   */
  const destination = event?.relatedTarget ?? null;
  if (destination) {
    return details.contains?.(destination) ? false : dismiss(details, documentRef, windowRef);
  }
  const inside = context.press === null ? false : (details.contains?.(context.press) ?? false);
  context.press = null;
  return inside ? false : dismiss(details, documentRef, windowRef);
};

const onKeyDown = (event, { documentRef, windowRef }) => {
  if (event?.key !== ESCAPE) {
    return false;
  }
  /* Escape closes the panel the reader is in, not whichever one happens to be
     open somewhere else. */
  const host = documentRef?.activeElement?.closest?.(DROPDOWN_SELECTOR) ?? null;
  if (host?.open !== true) {
    return dismissAllExcept(documentRef, null, windowRef);
  }
  const dismissed = dismiss(host, documentRef, windowRef);
  /* Return focus to the trigger, or the reader is dumped at the top of the
     document by the next Tab. The summary is a sibling, not an ancestor, so this
     is a real query. */
  host.querySelector?.(':scope > summary')?.focus?.();
  return dismissed;
};

/**
 * `astro:before-swap` rather than `after-swap`: the incoming document replaces
 * `<body>`, so an open panel is simply gone and its row animation would never
 * finish. Clearing the flag first means the disclosure controller's own handler on
 * the same event — registered before this one, so it runs first — finalises the
 * panel and clears its pending fallback timer against a panel that is no longer
 * marked as closing.
 */
const onBeforeSwap = (documentRef) => {
  for (const details of openDropdowns(documentRef)) {
    if (details.getAttribute?.(CLOSING_ATTRIBUTE) !== null) {
      details.removeAttribute?.(CLOSING_ATTRIBUTE);
    }
  }
};

const inert = { focusOut: () => false, keyDown: () => false, pointerDown: () => false };

const resolveTargets = (dependencies) => {
  const isDocument = typeof dependencies?.querySelector === 'function';
  const documentRef = isDocument ? dependencies : (dependencies.document ?? globalThis.document);
  return {
    documentRef,
    windowRef:
      dependencies.window ??
      (isDocument ? dependencies.defaultView : documentRef?.defaultView) ??
      globalThis.window,
  };
};

export function bindDropdownDismiss(dependencies = {}) {
  const { documentRef, windowRef } = resolveTargets(dependencies);

  if (!documentRef) {
    return inert;
  }
  const persistent = documentRef[DROPDOWN_DISMISS_KEY];
  if (persistent) {
    return persistent;
  }

  /*
   * `press` is shared, mutable, and deliberately not module state: it is per-bind
   * state that the pointer rule writes and the focus rule consumes, and two binds in
   * one process must not read each other's press.
   */
  const context = { documentRef, press: null, windowRef };
  const wrap = (handler) => (event) => handler(event, context);
  /* Any focus arriving somewhere invalidates a pending press as an explanation for
     a focus loss that has not happened yet. */
  const onFocusIn = () => {
    context.press = null;
  };

  const controller = {
    focusOut: wrap(onFocusOut),
    keyDown: wrap(onKeyDown),
    pointerDown: wrap(onPointerDown),
  };

  /* Capture, like the sibling rule it defers to, so it is evaluated before any
     bubble-phase handler can act on the same press. */
  documentRef.addEventListener?.('pointerdown', controller.pointerDown, true);
  documentRef.addEventListener?.('focusin', onFocusIn, true);
  documentRef.addEventListener?.('focusout', controller.focusOut);
  documentRef.addEventListener?.('keydown', controller.keyDown);
  documentRef.addEventListener?.('astro:before-swap', () => onBeforeSwap(documentRef));

  try {
    documentRef[DROPDOWN_DISMISS_KEY] = controller;
  } catch {
    /* A document that refuses the guard gets a second controller on the next bind
       rather than no controller at all. */
  }
  return controller;
}
