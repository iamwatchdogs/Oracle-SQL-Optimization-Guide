/*
 * Stamp a class on the two structures CSS was asking about with `:has()`.
 *
 * ## What this replaces
 *
 * Four selectors asked a structural question of the DOM:
 *
 *     .prose > p:has( > strong:only-child)          — a GFM callout
 *     .prose ul:has(> .task-list-item)              — a task list
 *     …>*+*:not(p:has(>strong:only-child)):…        — the prose sibling gap
 *     …>*+*… , > p:not(:has(>strong:only-child))    — ditto
 *
 * Both predicates are properties of the CONTENT, and the content is parsed before
 * it is styled. `:has()` asks the engine to re-derive that answer during layout
 * instead, and per Blink's `:has()` invalidation rules an attribute or class change
 * on ANY element schedules an ancestor-invalidation walk through every such chain.
 * The heaviest chapter has 8,240 elements and this site mutates attributes in bulk
 * — 84 `data-active` writes, 168 `aria-current` writes, and 3,371 expressive-code
 * token `style` attributes — so the chains were walked constantly to re-derive
 * something that had not changed since build time.
 *
 * ## Why the class, and why on the `<p>`
 *
 * `.callout` and `.task-list` are named rather than invented at the point of use,
 * and `.callout` is the name the project's own specs already use: a GFM callout is
 * a paragraph whose only child is a `<strong>`, because `> **Note:** …` is what
 * GitHub renders as `<p><strong>Note:</strong> …</p>`.
 *
 * `.task-list` goes on the `<ul>`, because that is the element the old rule styled
 * (`list-style-type` and `padding-inline-start` belong to the list, not the item)
 * and because `rehypeTaskLabels` already treats `.task-list-item` on the `<li>` as
 * the marker of a task list.
 *
 * THE CONSTRAINT worth stating: `.callout` is stamped on `<p>` ONLY. The sibling-gap
 * rule below excludes it with `:not(.callout)` in a chain that also excludes
 * `pre`, `details` and `.expressive-code`, so a class that could land on any element
 * would silently widen that exclusion from paragraphs to whatever else carries it.
 *
 * ## What it does not change
 *
 * No text is touched, no node is added or removed, and the nodes that get the class
 * are the same nodes the selector was already matching. Running it twice is a no-op,
 * because both writes check for the class first — which is what keeps it safe to
 * leave in the chain for content that arrives as raw HTML as well as markdown.
 */

/** A paragraph whose only ELEMENT child is a `<strong>`. */
export const CALLOUT_CLASS = 'callout';

/** The `<ul>` a GFM task list arrives in. */
export const TASK_LIST_CLASS = 'task-list';

const TASK_ITEM_CLASS = 'task-list-item';

const isElement = (node) => node?.type === 'element' && typeof node.tagName === 'string';

/** hast element `properties.className` is an ARRAY, but may arrive as a string. */
const classListOf = (node) => {
  const { className } = node?.properties ?? {};
  if (Array.isArray(className)) {
    return className;
  }
  return typeof className === 'string' ? className.split(/\s+/u) : [];
};

const hasClass = (node, name) => classListOf(node).includes(name);

/**
 * Push a class onto an element without disturbing what is already there, and
 * without writing when it is already present — the same compare-before-write rule
 * `applyAttribute` in `reading-prefs-store.mjs` follows, for the same reason.
 */
const addClass = (node, name) => {
  const { className } = node.properties ?? {};
  const list = Array.isArray(className)
    ? className
    : typeof className === 'string'
      ? className.split(/\s+/u)
      : [];
  if (list.includes(name)) {
    return false;
  }
  node.properties = { ...node.properties, className: [...list.filter(Boolean), name] };
  return true;
};

/**
 * `:only-child` counts ELEMENT children only, so a text node before or after the
 * `<strong>` does not disqualify the paragraph. GitHub emits exactly that shape,
 * with the label first and the sentence after it.
 */
const isCallout = (node) => {
  if (node.tagName !== 'p') {
    return false;
  }
  const elements = (node.children ?? []).filter((child) => isElement(child));
  return elements.length === 1 && elements[0].tagName === 'strong';
};

const isTaskListItem = (node) => node.tagName === 'li' && hasClass(node, TASK_ITEM_CLASS);

/**
 * Depth-first walk. One pass handles both stamps.
 *
 * The recursion is on CHILDREN, not on "if this is an element": the tree handed to a
 * rehype plugin is rooted at a `root` node, and a walk that returned early on anything
 * that is not an element would stop there and stamp nothing at all. So the element
 * test decides only what gets STAMPED, never whether the descent continues.
 */
function walk(node) {
  if (isElement(node)) {
    if (isCallout(node)) {
      addClass(node, CALLOUT_CLASS);
    }
    if (node.tagName === 'ul' && (node.children ?? []).some((child) => isTaskListItem(child))) {
      addClass(node, TASK_LIST_CLASS);
    }
  }
  for (const child of node?.children ?? []) {
    walk(child);
  }
}

export function rehypeCallouts() {
  return (tree) => {
    walk(tree);
  };
}
