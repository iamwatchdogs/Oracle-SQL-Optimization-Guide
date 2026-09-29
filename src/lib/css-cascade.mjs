import { compareSpecificity, createContext, ruleMatches, specificityOf } from './css-selectors.mjs';

const NESTING_AT_RULES = /^@(media|supports|container|layer|scope|starting-style)\b/u;

const skipString = (css, index) => {
  const quote = css[index];
  let cursor = index + 1;
  while (cursor < css.length) {
    if (css[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (css[cursor] === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return css.length;
};

const findBlockEnd = (css, openIndex) => {
  let depth = 0;
  let cursor = openIndex;
  while (cursor < css.length) {
    const character = css[cursor];
    if (character === '"' || character === "'") {
      cursor = skipString(css, cursor);
      continue;
    }
    if (character === '/' && css[cursor + 1] === '*') {
      const close = css.indexOf('*/', cursor + 2);
      cursor = close === -1 ? css.length : close + 2;
      continue;
    }
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor += 1;
  }
  return css.length - 1;
};

const splitTopLevel = (value, separator) => {
  const parts = [];
  let depth = 0;
  let current = '';
  let cursor = 0;
  while (cursor < value.length) {
    const character = value[cursor];
    if (character === '"' || character === "'") {
      const end = skipString(value, cursor);
      current += value.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (character === separator && depth === 0) {
      parts.push(current);
      current = '';
      cursor += 1;
      continue;
    }
    current += character;
    cursor += 1;
  }
  parts.push(current);
  return parts;
};

const parseDeclarations = (body) => {
  const declarations = new Map();
  for (const chunk of splitTopLevel(body, ';')) {
    const colon = splitTopLevel(chunk, ':');
    if (colon.length < 2) {
      continue;
    }
    const property = colon[0].trim();
    if (property) {
      declarations.set(property, colon.slice(1).join(':').trim());
    }
  }
  return declarations;
};

const collectRules = (source, base, layerName, sheet) => {
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '/' && source[cursor + 1] === '*') {
      const close = source.indexOf('*/', cursor + 2);
      cursor = close === -1 ? source.length : close + 2;
      continue;
    }
    if (character === '"' || character === "'") {
      cursor = skipString(source, cursor);
      continue;
    }
    if (character === ';{}') {
      cursor += 1;
      continue;
    }
    let stop = cursor;
    while (stop < source.length && !';{}'.includes(source[stop])) {
      stop += 1;
    }
    const prelude = source.slice(cursor, stop).trim();
    if (stop >= source.length || source[stop] !== '{') {
      cursor = stop + 1;
      continue;
    }
    const end = findBlockEnd(source, stop);
    const body = source.slice(stop + 1, end);
    const layerMatch = /^@layer\s+([\w-]+)$/u.exec(prelude);
    if (layerMatch) {
      const name = layerMatch[1];
      if (!sheet.layerRank.has(name)) {
        sheet.layerRank.set(name, sheet.layerRank.size);
      }
      sheet.layerRanges.push({ name, start: base + cursor, end: base + end + 1 });
      collectRules(body, base + stop + 1, name, sheet);
    } else if (NESTING_AT_RULES.test(prelude)) {
      collectRules(body, base + stop + 1, layerName, sheet);
    } else if (!prelude.startsWith('@')) {
      sheet.rules.push({
        selector: prelude,
        declarations: parseDeclarations(body),
        layer: layerName,
        order: sheet.rules.length,
        start: base + cursor,
      });
    }
    cursor = end + 1;
  }
};

const parseStylesheet = (css) => {
  const sheet = { rules: [], layerRanges: [], layerRank: new Map() };
  collectRules(css, 0, null, sheet);
  return sheet;
};

const layerRankOf = (rule, layerRank) =>
  rule.layer === null ? Number.POSITIVE_INFINITY : (layerRank.get(rule.layer) ?? -1);

const normalizeHex = (value) => {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/iu.exec(value);
  if (!hex) {
    return null;
  }
  const digits = hex[1];
  return digits.length === 3
    ? `#${[...digits].map((digit) => digit + digit).join('')}`
    : `#${digits.toLowerCase()}`;
};

const winningRule = (stylesheet, context, property) =>
  stylesheet.rules
    .filter((rule) => rule.declarations.has(property) && ruleMatches(rule.selector, context))
    .map((rule) => ({
      rule,
      rank: layerRankOf(rule, stylesheet.layerRank),
      specificity: specificityOf(rule.selector),
    }))
    .toSorted(
      (left, right) =>
        left.rank - right.rank ||
        compareSpecificity(left.specificity, right.specificity) ||
        left.rule.order - right.rule.order,
    )
    .at(-1)?.rule;

const resolveOnScope = (stylesheet, context, property, seen) => {
  const winner = winningRule(stylesheet, context, property);
  if (!winner) {
    return null;
  }
  const value = winner.declarations.get(property);
  const reference = /^var\((--[\w-]+)\)$/u.exec(value);
  if (!reference || seen.has(reference[1])) {
    return reference ? null : value;
  }
  const nested = new Set(seen).add(reference[1]);
  return resolveCustomProperty(stylesheet, context, reference[1], nested);
};

const resolveCustomProperty = (stylesheet, context, property, seen) => {
  for (const scope of [context, ...context.ancestors]) {
    const value = resolveOnScope(stylesheet, scope, property, seen);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

export const parseCompiledStylesheet = (css) => parseStylesheet(css);

export const isInsideLayer = (stylesheet, offset) =>
  stylesheet.layerRanges.find((range) => offset >= range.start && offset < range.end) ?? null;

export const selectorsDeclaring = (stylesheet, properties) =>
  stylesheet.rules
    .filter((rule) => properties.some((property) => rule.declarations.has(property)))
    .map((rule) => ({
      selector: rule.selector,
      layer: rule.layer,
      start: rule.start,
      declarations: rule.declarations,
    }));

export const resolveToken = (css, definition, property) =>
  resolveCustomProperty(
    parseCompiledStylesheet(css),
    createContext(definition),
    property,
    new Set(),
  );

export { normalizeHex };

export {
  compareSpecificity,
  createContext,
  parseCompound,
  ruleMatches,
  specificityOf,
  splitArguments,
  splitCompounds,
  splitSelector,
} from './css-selectors.mjs';
