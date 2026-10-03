import { createRouteFocusController } from './route-focus.mjs';
import { bindThemeController } from './theme-controller.mjs';
import { bindReadingPrefs } from './reading-prefs-controller.mjs';
import { bindDisclosureController } from './disclosure-controller.mjs';
import { bindDropdownDismiss } from './dropdown-dismiss.mjs';

/*
 * One client entry for the layout. Astro emits one chunk per <script> tag;
 * eight tags meant eight requests, eight wrappers, and four inline page-load
 * listeners each doing its own `querySelector` + `setTimeout` bookkeeping.
 * Everything here is module-level and runs once per browser session — the
 * guard props on `document` keep the it-can-be-injected-twice attributes of
 * the same blocks this file replaces.
 */

// Route focus handoff (see BaseLayout history and src/lib/route-focus.mjs).
if (!Object.prototype.hasOwnProperty.call(document, 'routeFocusInitialized')) {
  const controller = createRouteFocusController({ document });
  document.addEventListener('astro:before-preparation', () => controller.begin());
  document.addEventListener('astro:page-load', () => controller.pageLoad());
  Object.defineProperty(document, 'routeFocusInitialized', { value: true });
}

// Which kind of navigation: pager cell vs. everything else. Written twice
// because the router deletes it once after swap; the after-swap re-write lands
// before view-transition pseudo-element resolution.
if (!Object.prototype.hasOwnProperty.call(document, 'routeKindInitialized')) {
  let kind = 'jump';

  const write = () => {
    document.documentElement.dataset['nav'] = kind;
  };

  document.addEventListener('astro:before-preparation', (event) => {
    const source = event.sourceElement;
    const fromPager =
      source instanceof Element && source.closest('a[rel="prev"], a[rel="next"]') !== null;
    kind = fromPager ? 'pager' : 'jump';
    write();
  });

  document.addEventListener('astro:after-swap', write);

  Object.defineProperty(document, 'routeKindInitialized', { value: true });
}

// Sweep Astro's never-removed aria-live route announcer after each navigation.
if (!Object.prototype.hasOwnProperty.call(document, 'routeAnnouncerSweepInitialized')) {
  document.addEventListener('astro:page-load', () => {
    setTimeout(() => {
      for (const stale of document.querySelectorAll('.astro-route-announcer')) {
        stale.remove();
      }
    }, 150);
  });
  Object.defineProperty(document, 'routeAnnouncerSweepInitialized', { value: true });
}

bindThemeController({ document });
bindReadingPrefs({ document });
bindDisclosureController({ document });
bindDropdownDismiss({ document });

// Title-block entrance plays once per document: clear the marker on the first
// completed navigation after the initial load.
if (!Object.prototype.hasOwnProperty.call(document, 'titleEntranceInitialized')) {
  let initial = true;
  document.addEventListener('astro:page-load', () => {
    if (initial) {
      initial = false;
      return;
    }
    delete document.documentElement.dataset['titleEntrance'];
  });
  Object.defineProperty(document, 'titleEntranceInitialized', { value: true });
}
