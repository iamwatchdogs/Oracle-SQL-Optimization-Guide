import { describe, expect, test } from 'vitest';
import {
  CLOSING_ATTRIBUTE,
  bindDisclosureController,
} from '../../src/lib/disclosure-controller.mjs';
import { bindDropdownDismiss } from '../../src/lib/dropdown-dismiss.mjs';

/*
 * A `<details>` shaped just enough for the dismissal rules, with the REAL
 * disclosure controller bound alongside.
 *
 * Binding both is the point. The dismiss module delegates its close to
 * `requestDisclosureClose`, so a harness with no controller under it would take
 * the native-close fallback and every "it closed on the animated path" assertion
 * would pass for the wrong reason.
 *
 * `closest` is a stub driven by explicit wiring rather than a selector engine: the
 * rules branch on three questions — "is the target inside a dropdown", "is it a
 * header summary", "is it inside this panel" — and a real engine would let a test
 * pass because a selector happened to match a class name rather than because the
 * rule took the branch it was written to take.
 */
const outside = { closest: () => null, kind: 'a', parentIsSummary: false };

const listenerKey = (type, capture) => `${type}:${capture ? 'capture' : 'bubble'}`;

const createDetails = ({ open = true, inHeader = true } = {}) => {
  const summary = {
    focused: 0,
    focus() {
      this.focused += 1;
    },
    kind: 'summary',
    parentIsSummary: true,
  };
  const inside = { kind: 'button', parentIsSummary: false };
  const flow = { classList: { contains: (name) => name === 'disclosure-flow' } };
  const details = {
    attributes: new Set(open ? ['open'] : []),
    children: [flow],
    contains: (node) => node === summary || node === inside,
    getAttribute: (name) => (details.attributes.has(name) ? '' : null),
    open,
    removeAttribute: (name) => details.attributes.delete(name),
    setAttribute: (name) => details.attributes.add(name),
  };
  summary.parentElement = details;

  const closest = (target, selector) => {
    if (selector === '[data-dropdown]') {
      return target === summary || target === inside ? details : null;
    }
    if (selector === 'summary' || selector === 'details') {
      return target === summary ? details : null;
    }
    return selector === 'header summary' && inHeader && target === summary ? summary : null;
  };
  for (const node of [details, summary, inside]) {
    node.closest = (selector) => closest(node, selector);
  }
  details.querySelector = (selector) => (selector === ':scope > summary' ? summary : null);

  return { details, inside, summary };
};

/*
 * A listener bag that records what was registered, because "one set of listeners
 * per document however many times it binds" is a property of these modules that
 * only a real re-bind can show.
 */
const createFakeDocument = (details) => {
  const listeners = new Map();
  const documentRef = {
    activeElement: null,
    addEventListener: (type, handler, capture) => {
      const key = listenerKey(type, capture);
      listeners.set(key, [...(listeners.get(key) ?? []), handler]);
    },
    listeners,
    querySelectorAll: () => (details.open ? [details] : []),
  };
  const emit = (type, event, capture = false) => {
    for (const handler of listeners.get(listenerKey(type, capture)) ?? []) {
      handler(event);
    }
  };
  return { documentRef, emit };
};

const createHarness = ({ open = true, reducedMotion = false } = {}) => {
  const built = createDetails({ open });
  const { documentRef, emit } = createFakeDocument(built.details);
  const windowRef = { matchMedia: () => ({ matches: reducedMotion }) };
  /* Nothing is scheduled for real: the 400ms fallback would outlive the test. */
  const timers = { clearTimeout: () => {}, setTimeout: () => 1 };

  bindDisclosureController({ document: documentRef, timers, window: windowRef });
  bindDropdownDismiss({ document: documentRef, window: windowRef });

  return {
    ...built,
    documentRef,
    outside,
    bind: () => bindDropdownDismiss({ document: documentRef, window: windowRef }),
    /* Both are registered in capture: the press rule defers to the sibling rule
       that way, and `focusin` has to invalidate a pending press before any bubble
       listener can act on the same focus. */
    press: (target) => emit('pointerdown', { target }, true),
    focusIn: (target) => emit('focusin', { target }, true),
    type: (event) => emit(event.type, event),
  };
};

const closing = (harness) => harness.details.attributes.has(CLOSING_ATTRIBUTE);

describe('a press outside the panel', () => {
  test('a press inside the panel is not an outside press', () => {
    const harness = createHarness();
    harness.press(harness.inside);
    expect(closing(harness)).toBe(false);
    expect(harness.details.open).toBe(true);
  });

  test('a press outside it starts a close on the animated path', () => {
    const harness = createHarness();
    harness.press(outside);
    /* `open` is still true: the controller keeps it set while the row folds, which
       is what makes this a close rather than a disappearance. */
    expect(closing(harness)).toBe(true);
    expect(harness.details.open).toBe(true);
  });

  test('a press on a header summary is left to the sibling rule', () => {
    /*
     * `reading-prefs-controller` closes the other header disclosure synchronously on
     * capture. Two rules racing means one of them closes the panel natively and the
     * animation is lost, so this stands back rather than double-closing.
     */
    const harness = createHarness();
    harness.press(harness.summary);
    expect(closing(harness)).toBe(false);
  });

  test('a second dismissal while a close is in flight does not restart it', () => {
    const harness = createHarness();
    harness.press(outside);
    /* Redundant, not a cancel. Cancellation belongs to the summary-click path,
       where a reader can see the panel and change their mind about it. */
    harness.press(outside);
    expect(closing(harness)).toBe(true);
  });
});

describe('focus leaving the panel', () => {
  test('focus moving within the panel is not leaving it', () => {
    /* The tab from a summary to the first stepper: a real `focusout` on the
       summary with a `relatedTarget` inside the same panel. */
    const harness = createHarness();
    harness.type({ relatedTarget: harness.inside, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(false);
  });

  test('focus moving out of it closes it', () => {
    const harness = createHarness();
    harness.type({ relatedTarget: outside, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });

  test('focus leaving the document closes it', () => {
    /*
     * A null `relatedTarget` and no active element is focus that went nowhere — a
     * dismissed dialog, a closed shadow root, a document that lost focus
     * altogether. That is a dismissal.
     */
    const harness = createHarness();
    harness.documentRef.activeElement = null;
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });

  test('a focusout from outside any dropdown is ignored', () => {
    const harness = createHarness();
    harness.type({ relatedTarget: outside, target: outside, type: 'focusout' });
    expect(closing(harness)).toBe(false);
  });
});

/*
 * WebKit reports no destination at all when a click moves focus, and the two
 * engines do not agree on whether it moved. Both halves have to hold: reading a
 * null `relatedTarget` as "the reader looked away" closed the reading preferences
 * on the FIRST preference click in WebKit, which is the one action the panel
 * exists for.
 */
describe('a focus loss with no reported destination', () => {
  test('caused by a press inside the panel, it does not dismiss', () => {
    const harness = createHarness();
    /* The real WebKit sequence: a press on a stepper the engine refuses to focus,
       which blurs the summary and reports nothing. */
    harness.press(harness.inside);
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(false);
    expect(harness.details.open).toBe(true);
  });

  test('caused by a press outside the panel, it does dismiss', () => {
    const harness = createHarness();
    harness.press(outside);
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });

  test('with no press at all, it is a dismissal', () => {
    const harness = createHarness();
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });

  test('a press excuses one focus loss, not a second', () => {
    /*
     * Otherwise a single click would leave the panel permanently un-dismissable by
     * focus, and the reader would have to click outside to get rid of it.
     */
    const harness = createHarness();
    harness.press(harness.inside);
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(false);
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });

  test('focus arriving somewhere discards a pending press', () => {
    /*
     * The press is an explanation for a focus loss, not a licence. Without this, a
     * press that moved no focus could excuse an unrelated blur minutes later.
     */
    const harness = createHarness();
    harness.press(harness.inside);
    harness.focusIn(harness.inside);
    harness.type({ relatedTarget: null, target: harness.summary, type: 'focusout' });
    expect(closing(harness)).toBe(true);
  });
});

describe('the keyboard', () => {
  test('Escape closes and returns focus to the trigger', () => {
    const harness = createHarness();
    harness.documentRef.activeElement = harness.inside;
    harness.type({ key: 'Escape', type: 'keydown' });
    expect(closing(harness)).toBe(true);
    /* Without the hand-back, the next Tab would start from the top of the document
       — on a 40-link page, a whole viewport of controls re-traversed. */
    expect(harness.summary.focused).toBe(1);
  });

  test('any other key does nothing', () => {
    const harness = createHarness();
    harness.type({ key: 'Enter', type: 'keydown' });
    expect(closing(harness)).toBe(false);
  });
});

describe('lifecycle and motion', () => {
  test('reduced motion closes natively, without the closing flag', () => {
    /*
     * The animated path is what keeps `open` true while the row folds away, and
     * nothing else in the project knows the panel is on its way out. Under reduced
     * motion the close is immediate and correct, and must not leave a closing flag
     * behind for a transition that will never run.
     */
    const harness = createHarness({ reducedMotion: true });
    harness.press(outside);
    expect(harness.details.open).toBe(false);
    expect(closing(harness)).toBe(false);
  });

  test('a swap abandons a close in flight', () => {
    const harness = createHarness();
    harness.press(outside);
    expect(closing(harness)).toBe(true);
    harness.type({ type: 'astro:before-swap' });
    expect(closing(harness)).toBe(false);
  });

  test('one set of listeners per document, however many times it binds', () => {
    const harness = createHarness();
    harness.bind();
    harness.bind();
    const types = ['pointerdown:capture', 'focusout:bubble', 'keydown:bubble'];
    for (const key of types) {
      expect(harness.documentRef.listeners.get(key)).toHaveLength(1);
    }
  });

  test('binds nothing without a document', () => {
    expect(() => bindDropdownDismiss({ document: null })).not.toThrow();
  });
});
