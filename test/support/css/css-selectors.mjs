import { parseCompound, splitArguments, splitSelector } from './css-compounds.mjs';

const descendants = (context) => {
  const found = [];
  for (const child of context.children ?? []) {
    found.push(child, ...descendants(child));
  }
  return found;
};

/*
 * Adjacent (`+`) and general-sibling (`~`) combinators.
 *
 * These used to return `false` outright, so any selector containing one was
 * reported as never matching. That is not a harmless limitation: the project's
 * own `mt-prose-sibling` utility compiles to `…>*+:not(h2)…`, so
 * `resolveToken` could not see a rule that demonstrably wins. The result was a
 * silent false negative in the audit tooling, indistinguishable from "correctly
 * absent" — which is how authored prose rules losing a cascade layer went
 * unnoticed.
 */
const previousSiblings = (context) => {
  const parent = context.ancestors[0];
  if (!parent) {
    return [];
  }
  const siblings = parent.children ?? [];
  const index = siblings.indexOf(context);
  return index <= 0 ? [] : siblings.slice(0, index);
};

const matchesParts = (parts, context, index) => {
  if (index < 0) {
    return true;
  }
  if (!compoundMatches(parseCompound(parts[index].compound), context)) {
    return false;
  }
  if (index === 0) {
    return true;
  }
  const combinator = parts[index].combinator ?? ' ';
  if (combinator === '>') {
    const parent = context.ancestors[0];
    return parent !== undefined && matchesParts(parts, parent, index - 1);
  }
  if (combinator === '+' || combinator === '~') {
    const candidates = previousSiblings(context);
    const pool = combinator === '+' ? candidates.slice(-1) : candidates;
    return pool.some((sibling) => matchesParts(parts, sibling, index - 1));
  }
  return context.ancestors.some((ancestor) => matchesParts(parts, ancestor, index - 1));
};

const matchesSingleSelector = (selector, context) => {
  const parts = splitSelector(selector);
  return parts.length > 0 && matchesParts(parts, context, parts.length - 1);
};

/*
 * A rule's `selector` may be a comma-separated LIST, not a single chain. A
 * comma is also legal inside `:is()`, `:not()` and `:has()`, so only top-level
 * commas (those outside brackets) split the rule.
 */
const splitSelectorList = (selector) => {
  const list = [];
  let depth = 0;
  let current = '';
  for (const character of selector) {
    if (character === '(' || character === '[') {
      depth += 1;
    } else if (character === ')' || character === ']') {
      depth = Math.max(0, depth - 1);
    }
    if (character === ',' && depth === 0) {
      list.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  list.push(current);
  return list.map((entry) => entry.trim()).filter(Boolean);
};

const matchesSelector = (selector, context) =>
  splitSelectorList(selector).some((entry) => matchesSingleSelector(entry, context));

const RELATIVE_ANCHORS = new Set([null, ' ', '>']);

const matchesRelative = (argument, context) => {
  for (const relative of splitArguments(argument)) {
    const parts = splitSelector(relative);
    if (parts.length === 0) {
      continue;
    }
    const anchor = parts[0].combinator;
    if (!RELATIVE_ANCHORS.has(anchor)) {
      continue;
    }
    const candidates =
      anchor === '>' ? (context.children ?? []) : [context, ...descendants(context)];
    const last = parts.length - 1;
    if (candidates.some((candidate) => matchesParts(parts, candidate, last))) {
      return true;
    }
  }
  return false;
};

const attributeMatches = (part, context) =>
  part.value === undefined
    ? context.attributes.has(part.name)
    : context.attributes.get(part.name) === part.value;

const compoundMatches = (parts, context) =>
  parts.every((part) => {
    switch (part.kind) {
      case 'class': {
        return context.classes.has(part.name);
      }
      case 'id': {
        return context.id === part.name;
      }
      case 'type': {
        return context.types.has(part.name);
      }
      case 'root': {
        return context.types.has('html') && context.ancestors.length === 0;
      }
      case 'onlyChild': {
        return context.onlyChild === true;
      }
      case 'any': {
        return splitArguments(part.argument).some((selector) => matchesSelector(selector, context));
      }
      case 'none': {
        return !splitArguments(part.argument).some((selector) =>
          matchesSelector(selector, context),
        );
      }
      case 'has': {
        return matchesRelative(part.argument, context);
      }
      case 'state': {
        return false;
      }
      default: {
        return attributeMatches(part, context);
      }
    }
  });

export const ruleMatches = (selector, context) => matchesSelector(selector, context);

export const createContext = (definition) => {
  const ancestors = (definition.ancestors ?? []).map((ancestor) => createContext(ancestor));
  for (const [index, ancestor] of ancestors.entries()) {
    ancestor.ancestors = ancestors.slice(index + 1);
  }
  const children = (definition.children ?? []).map((child) => createContext(child));
  const onlyChild = children.length === 1;
  for (const child of children) {
    child.onlyChild = onlyChild;
  }
  return {
    id: definition.id ?? null,
    classes: new Set(definition.classes ?? []),
    types: new Set(definition.types ?? []),
    attributes: new Map(Object.entries(definition.attributes ?? {})),
    ancestors,
    children,
    onlyChild: definition.onlyChild === true,
  };
};

export {
  compareSpecificity,
  parseCompound,
  specificityOf,
  splitArguments,
  splitCompounds,
  splitSelector,
} from './css-compounds.mjs';
