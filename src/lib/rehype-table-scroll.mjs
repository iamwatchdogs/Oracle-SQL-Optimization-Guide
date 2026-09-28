/*
 * Wrap every markdown `<table>` in a dedicated horizontal scroll container.
 *
 * Why this exists. The reading surface needs two things from a table at once,
 * and no CSS value provides both:
 *
 * 1. It must scroll horizontally rather than widen the page. A GFM table
 *    arrives with no wrapper, so the usual shortcut is to make the table itself
 *    the scroll container: `display: block; overflow-x: auto`. That is exactly
 *    what this stylesheet used to do, and it is why one wide table once pushed
 *    a 390px phone to 914px.
 * 2. It must fill the 70ch measure, so its header rule and row rules share a
 *    right edge with the prose around it.
 *
 * Those are mutually exclusive in CSS. `overflow` is only honoured on a block
 * container, inline container, or table WRAPPER — never on a table box — so
 * `display: block` clamps `overflow-x` back to `visible` and hands the overflow
 * to the page; and with the table kept as `display: block` the row groups fall
 * into an anonymous table box sized to fit-content, so `width: 100%` on the
 * block stretches nothing. Measured on the shipped corpus: a two-column table
 * rendered 239px wide inside a 647px measure, and no declaration could move it
 * (`width`/`min-width` on the groups, `width: 100%` on the rows, and a 1px cell
 * hint were all tried and all left it at 239px).
 *
 * So the container is built in the tree instead of in the cascade. The table
 * keeps its real `display: table` box — and therefore its header, rows and cells
 * — and the wrapper owns the overflow.
 *
 * Text is never touched: the transform only inserts a parent element around an
 * existing one and moves the same node reference. Running it twice is a no-op.
 */

const WRAPPER_CLASS = 'prose-table-scroll';

/* hast element `properties` is an OBJECT (`{ className: [...] }`), not a list. */
const isElement = (node) =>
  Boolean(node) &&
  node.type === 'element' &&
  typeof node.tagName === 'string' &&
  typeof node.properties === 'object' &&
  node.properties !== null;

const isTable = (node) => isElement(node) && node.tagName === 'table';

/** True for exactly the `<div class="prose-table-scroll">` this plugin emits. */
const isOwnWrapper = (node) => {
  if (!isElement(node) || node.tagName !== 'div') {
    return false;
  }
  const { className } = node.properties;
  const list = Array.isArray(className)
    ? className
    : typeof className === 'string'
      ? className.split(/\s+/u)
      : [];
  return list.includes(WRAPPER_CLASS);
};

const buildWrapper = (table) => ({
  type: 'element',
  tagName: 'div',
  properties: { className: [WRAPPER_CLASS] },
  children: [table],
});

/**
 * Depth-first, in place, over one node's children.
 *
 * `insideTable` is what stops a nested table from getting a second container:
 * a `<table>` in a cell is already reachable by scrolling its outer table, and a
 * nested axis of its own is what used to be impossible to reason about.
 *
 * An existing wrapper is entered with `insideTable` already set, which is also
 * what makes the transform idempotent: the second run sees the `<div>`, does not
 * treat it as a table, and therefore does not wrap the table inside it again.
 */
function walkChildren(node, insideTable) {
  if (!Array.isArray(node?.children)) {
    return;
  }

  const next = [];
  for (const child of node.children) {
    if (isTable(child) && !insideTable) {
      walkChildren(child, true);
      next.push(buildWrapper(child));
      continue;
    }
    walkChildren(child, insideTable || isTable(child) || isOwnWrapper(child));
    next.push(child);
  }

  node.children = next;
}

export function rehypeTableScroll() {
  return (tree) => {
    walkChildren(tree, false);
  };
}

export { WRAPPER_CLASS };
