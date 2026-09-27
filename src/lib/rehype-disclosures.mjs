import { fromHtml } from 'hast-util-from-html';

const disclosureContentClasses = ['disclosure-content', 'disclosure-flow'];
const disclosureInnerClasses = ['disclosure-content-inner', 'disclosure-flow-inner'];

const detailsOpenTag = /<details(?=[\s/>])/iu;

const isRawHtml = (node) =>
  (node?.type === 'raw' || node?.type === 'html') && typeof node.value === 'string';

const holdsDetailsMarkup = (node) => isRawHtml(node) && detailsOpenTag.test(node.value);

const isSummary = (node) => node?.type === 'element' && node.tagName === 'summary';

const isWhitespaceText = (node) =>
  node?.type === 'text' && typeof node.value === 'string' && node.value.trim() === '';

const classNames = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return typeof value === 'string' ? value.split(/\s+/u).filter(Boolean) : [];
};

const hasClass = (node, className) => classNames(node.properties?.className).includes(className);

const addClass = (node, className) => {
  if (hasClass(node, className)) {
    return;
  }

  node.properties ??= {};
  const value = node.properties.className;
  if (Array.isArray(value)) {
    value.push(className);
  } else if (typeof value === 'string') {
    node.properties.className = `${value} ${className}`.trim();
  } else {
    node.properties.className = [className];
  }
};

const addClasses = (node, names) => {
  for (const className of names) {
    addClass(node, className);
  }
};

const isDisclosureContent = (node) =>
  node?.type === 'element' && node.tagName === 'div' && hasClass(node, 'disclosure-content');

const isDisclosureInner = (node) =>
  node?.type === 'element' &&
  node.tagName === 'div' &&
  Array.isArray(node.children) &&
  node.children.length > 0 &&
  hasClass(node, 'disclosure-content-inner');

const isCanonicalDisclosureContent = (node) =>
  isDisclosureContent(node) && node.children?.length === 1 && isDisclosureInner(node.children[0]);

const getSummaryIndex = (children) => {
  const firstMeaningfulIndex = children.findIndex((child) => !isWhitespaceText(child));
  const firstMeaningfulChild = children[firstMeaningfulIndex];
  const summaryCount = children.filter((child) => isSummary(child)).length;

  if (!isSummary(firstMeaningfulChild) || summaryCount !== 1) {
    return -1;
  }

  return firstMeaningfulIndex;
};

const createDisclosureContent = (children) => ({
  type: 'element',
  tagName: 'div',
  properties: { className: [...disclosureContentClasses] },
  children: [
    {
      type: 'element',
      tagName: 'div',
      properties: { className: [...disclosureInnerClasses] },
      children,
    },
  ],
});

const countMatches = (value, pattern) => (value.match(pattern) ?? []).length;

const detailsOpenTagGlobal = /<details(?=[\s/>])/giu;
/* Anchored to the END of the raw node, not merely present somewhere in it. The
 * absorb loop below consumes a whole raw node once this matches, so a node that
 * carried a stray closing tag followed by more markup — `</details>\n<p>After
 * it</p>` — had that trailing `<p>` re-homed INSIDE the disclosure panel. No text
 * was lost or duplicated (the range is replaced with the same node references
 * plus the parsed fragment), but content an author wrote after the panel ended up
 * before its end. */
const detailsCloseTag = /<\/details\s*>$/iu;
const detailsCloseTagGlobal = /<\/details\s*>/giu;

const isBalanced = (value) =>
  countMatches(value, detailsOpenTagGlobal) <= countMatches(value, detailsCloseTagGlobal);

const absorbDetailsBody = (siblings, startIndex) => {
  const absorbed = [];
  let index = startIndex;

  while (index < siblings.length) {
    const sibling = siblings[index];

    if (isRawHtml(sibling)) {
      if (!detailsCloseTag.test(sibling.value)) {
        break;
      }
      absorbed.push(...fromHtml(sibling.value, { fragment: true }).children);
      index += 1;
      break;
    }

    absorbed.push(sibling);
    index += 1;
  }

  return { absorbed, nextIndex: index };
};

const closeOpenDetails = (parsed, absorbed) => {
  const trailing = parsed.at(-1);
  if (trailing?.type === 'element' && trailing.tagName === 'details') {
    trailing.children = [...trailing.children, ...absorbed];
    return parsed;
  }
  return [...parsed, ...absorbed];
};

const expandRawDetails = (node) => {
  const children = node?.children;
  if (!Array.isArray(children)) {
    return;
  }

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (holdsDetailsMarkup(child)) {
      const parsed = fromHtml(child.value, { fragment: true }).children;
      const continuation = isBalanced(child.value)
        ? { absorbed: [], nextIndex: index + 1 }
        : absorbDetailsBody(children, index + 1);
      const inserted =
        continuation.absorbed.length > 0 ? closeOpenDetails(parsed, continuation.absorbed) : parsed;

      children.splice(index, continuation.nextIndex - index, ...inserted);
      inserted.forEach((insertedNode) => {
        expandRawDetails(insertedNode);
      });
      index += inserted.length - 1;
      continue;
    }

    expandRawDetails(child);
  }
};

export function rehypeDisclosures() {
  return (tree) => {
    expandRawDetails(tree);

    const visit = (node) => {
      if (node?.type === 'element' && node.tagName === 'details') {
        const children = Array.isArray(node.children) ? node.children : [];
        const summaryIndex = getSummaryIndex(children);

        if (summaryIndex !== -1) {
          const content = children.slice(summaryIndex + 1);
          const canonical = content.find((child) => isCanonicalDisclosureContent(child));
          const hasOtherDisclosureContent = content.some(
            (child) => isDisclosureContent(child) && child !== canonical,
          );

          if (canonical && !hasOtherDisclosureContent) {
            addClasses(canonical, disclosureContentClasses);
            const inner = canonical.children[0];
            addClasses(inner, disclosureInnerClasses);
            addClass(node, 'group');

            const canonicalIndex = content.indexOf(canonical);
            const before = content.slice(0, canonicalIndex);
            const after = content.slice(canonicalIndex + 1);
            if (before.length > 0 || after.length > 0) {
              inner.children = [...before, ...inner.children, ...after];
              node.children = [...children.slice(0, summaryIndex + 1), canonical];
            }
          } else if (content.length > 0 && !hasOtherDisclosureContent && !canonical) {
            node.children = [
              ...children.slice(0, summaryIndex + 1),
              createDisclosureContent(content),
            ];
            addClass(node, 'group');
          }
        }
      }

      if (Array.isArray(node?.children)) {
        node.children.forEach(visit);
      }
    };

    visit(tree);
  };
}
