/**
 * Give a bare task-list checkbox an accessible name.
 *
 * GFM renders `- [ ] text` as a `disabled` checkbox followed by a bare text node:
 *
 *     <li class="task-list-item"><input type="checkbox" disabled> I chose the …</li>
 *
 * The sentence is a sibling of the input, not a `<label>` for it, so the input has
 * no accessible name at all — 13 of them on `/00-preface/`, 5 on `/04-recipes/`,
 * and the same on a dozen other routes. A checkbox announced only as "unchecked,
 * dimmed" tells a screen-reader user nothing about which item it belongs to.
 *
 * ## Why an `aria-label` and not a `<label>` wrapper
 *
 * Wrapping the input and its text in a `<label>` is the textbook fix, but the
 * stylesheet deliberately takes the checkbox out of flow
 * (`.prose .task-list-item input[type='checkbox']`) so the sentence stays ordinary
 * running text. A wrapper element in the middle of that changes which element the
 * sentence is a child of, so it would put the layout back at risk to fix a naming
 * problem that an attribute solves.
 *
 * The name is the item's own text, which is what a visible `<label>` would have
 * supplied, so the accessible name still matches the visible label and satisfies
 * label-in-name. Text inside inline code, links and emphasis is included, since
 * that is what the reader sees; the checkbox itself is skipped so the name does
 * not begin with "unchecked".
 *
 * Content is frozen, so this is a transform rather than an edit: the markdown is
 * the author's, and a missing label is a rendering defect.
 */

/** A name long enough to identify the item without reading a paragraph aloud. */
const MAX_LABEL_LENGTH = 160;

const SKIP = new Set(['input', 'script', 'style', 'template']);

/** Flatten a subtree to its text, skipping the checkbox and other non-text. */
const textOf = (node, parts) => {
  if (node.type === 'text') {
    parts.push(node.value);
    return;
  }
  if (node.type !== 'element' || SKIP.has(node.tagName)) {
    return;
  }
  for (const child of node.children ?? []) {
    textOf(child, parts);
  }
};

export const rehypeTaskLabels = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'li') {
      return;
    }
    const items = (node.children ?? []).filter(
      (child) =>
        child.type === 'element' &&
        child.tagName === 'input' &&
        child.properties?.type === 'checkbox',
    );
    if (items.length === 0) {
      return;
    }

    /*
     * Joined with nothing, not with a space: the author's own spacing already lives
     * in the text nodes, so adding a separator here would put a gap before the
     * closing period of every item that ends in inline markup.
     */
    const parts = [];
    textOf(node, parts);
    const label = parts.join('').replaceAll(/\s+/gu, ' ').trim().slice(0, MAX_LABEL_LENGTH).trim();
    if (label === '') {
      return;
    }

    for (const item of items) {
      if (item.properties?.['aria-label'] === undefined) {
        item.properties['aria-label'] = label;
      }
    }
  });
};

/**
 * Depth-first walk. Small enough not to warrant a dependency, and the project
 * already treats the processor module as the place a transform lives.
 */
function visit(node, type, visitor) {
  if (node.type === type) {
    visitor(node);
  }
  for (const child of node.children ?? []) {
    visit(child, type, visitor);
  }
}
