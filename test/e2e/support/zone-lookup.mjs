/*
 * Which zone paints a given element.
 *
 * Deliberately a module, not an inline `page.evaluate` body, and for one reason: Astro does
 * not emit `view-transition-name` as an inline style. It scopes a template's
 * `transition:name` to a build-unique `data-astro-transition-scope` id and writes the name in
 * a generated stylesheet rule keyed on that id, so the attribute on the element carries an
 * id and nothing else. Reading the `style` attribute finds nothing — which is why
 * `not-found.spec.mjs` asserts the scope attribute instead.
 *
 * This is a module because it is a FUNCTION the other evaluate bodies need to call. A
 * `page.evaluate` body is serialised and evaluated in the page, where module scope does not
 * exist, so a helper has to travel as a string and be re-parsed there. One exported function
 * used by two evaluators is the smallest honest form of that.
 */
export const ZONE_OF_SOURCE = `
  (element) => {
    const scope = element?.closest?.('[data-astro-transition-scope]');
    if (!scope) return null;

    const id = scope.getAttribute('data-astro-transition-scope');
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.selectorText !== '[data-astro-transition-scope="' + id + '"]') continue;

        const match = /view-transition-name:\\s*([\\w-]+)\\s*;/u.exec(rule.cssText ?? '');
        if (match) return match[1];
      }
    }
    return null;
  }
`;

/**
 * The zone that paints a given element, or null.
 *
 * A zone is a snapshot of a subtree, so an element belongs to its nearest scoped ancestor —
 * the innermost wins, which is what the browser does too. `meta` is nested inside
 * `body-home` and paints as its own group, so this returns `meta` for the metadata margin
 * rather than `body-home`.
 */
export const readZoneOf = (page, selector) =>
  page.evaluate(
    ([target, source]) => {
      // eslint-disable-next-line no-new-func
      const zoneOf = new Function(`return ${source}`)();
      return zoneOf(document.querySelector(target));
    },
    [selector, ZONE_OF_SOURCE],
  );
