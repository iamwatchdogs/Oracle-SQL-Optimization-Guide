/**
 * Shared markdown-table probes.
 *
 * The table specs assert against computed styles rather than class names, because
 * the regression they guard is a *cascade-layer* one: the authored table rules
 * lost to `@tailwindcss/typography` no matter what the selectors said. Reading
 * the values the layout engine actually resolved is the only way to see it.
 */

/**
 * Computed styles for the first match of `selector`, keyed by kebab-case name.
 *
 * Used for the scroll WRAPPER, which is not the element `tableMetrics` describes.
 * Reading the values the layout engine resolved is the whole point — see the file
 * note on cascade layers.
 */
export function computedStyles(page, selector, properties) {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (node, names) =>
        Object.fromEntries(
          names.map((name) => [name, getComputedStyle(node).getPropertyValue(name)]),
        ),
      properties,
    );
}

/** Computed metrics for one table: the box, its scroll box, and six cells.
 *
 * `box` is declared *inside* the callback on purpose. A `locator.evaluate`
 * callback is serialised and re-parsed in the browser, so it closes over
 * nothing: any helper it calls has to be part of the function body. Hoisting
 * `box` to module scope produces `ReferenceError: box is not defined` in the
 * page, which is exactly the regression this file's shape is here to keep
 * honest.
 */
export function tableMetrics(locator) {
  return locator.evaluate((table) => {
    /** Computed metrics for one cell, straight from the layout engine. */
    function box(el) {
      if (!el) {
        return null;
      }
      const s = getComputedStyle(el);
      return {
        paddingTop: s.paddingTop,
        paddingRight: s.paddingRight,
        paddingBottom: s.paddingBottom,
        paddingLeft: s.paddingLeft,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        verticalAlign: s.verticalAlign,
        borderBottom: s.borderBottomWidth,
        whiteSpace: s.whiteSpace,
        overflowWrap: s.overflowWrap,
      };
    }

    const tableStyle = getComputedStyle(table);
    return {
      display: tableStyle.display,
      overflowX: tableStyle.overflowX,
      overscrollBehaviorX: tableStyle.overscrollBehaviorX,
      boxWidth: Math.round(table.getBoundingClientRect().width),
      clientWidth: table.clientWidth,
      scrollWidth: table.scrollWidth,
      fontSize: tableStyle.fontSize,
      fontFamily: tableStyle.fontFamily,
      head: box(table.querySelector('thead th')),
      firstHead: box(table.querySelector('thead th:first-child')),
      lastHead: box(table.querySelector('thead th:last-child')),
      cell: box(table.querySelector('tbody td')),
      firstCell: box(table.querySelector('tbody td:first-child')),
      lastCell: box(table.querySelector('tbody td:last-child')),
    };
  });
}
