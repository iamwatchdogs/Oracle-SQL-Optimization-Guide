const COMBINATOR_CHARACTERS = new Set(['>', '+', '~']);

const isDelimiter = (character) =>
  character === '.' || character === '#' || character === '[' || character === ':';

const skipString = (value, index) => {
  const quote = value[index];
  let cursor = index + 1;
  while (cursor < value.length) {
    if (value[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (value[cursor] === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return value.length;
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
    if (character === '(' || character === '[') {
      depth += 1;
    } else if (character === ')' || character === ']') {
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

export const splitArguments = (value) =>
  splitTopLevel(value, ',')
    .map((argument) => argument.trim())
    .filter((argument) => argument !== '');

const flushCompound = (tokens, current) => {
  if (current === '') {
    return '';
  }
  tokens.push({ type: 'compound', value: current });
  return '';
};

const tokenizeSelector = (selector) => {
  const tokens = [];
  let depth = 0;
  let current = '';
  let pendingSpace = false;
  let cursor = 0;

  while (cursor < selector.length) {
    const character = selector[cursor];

    if (character === '"' || character === "'") {
      const end = skipString(selector, cursor);
      current += selector.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (depth === 0 && COMBINATOR_CHARACTERS.has(character)) {
      current = flushCompound(tokens, current);
      tokens.push({ type: 'combinator', value: character });
      pendingSpace = false;
      cursor += 1;
      continue;
    }
    if (depth === 0 && /\s/u.test(character)) {
      if (current !== '') {
        current = flushCompound(tokens, current);
        pendingSpace = true;
      }
      cursor += 1;
      continue;
    }
    if (current === '' && pendingSpace) {
      tokens.push({ type: 'combinator', value: ' ' });
      pendingSpace = false;
    }
    current += character;
    cursor += 1;
  }
  flushCompound(tokens, current);
  return tokens;
};

export const splitSelector = (selector) => {
  const parts = [];
  let combinator = null;
  for (const token of tokenizeSelector(selector)) {
    if (token.type === 'combinator') {
      combinator = token.value;
      continue;
    }
    parts.push({ combinator, compound: token.value });
    combinator = null;
  }
  return parts;
};

export const splitCompounds = (selector) => splitSelector(selector).map((part) => part.compound);

const closingBracket = (value, openIndex) => {
  let depth = 0;
  let cursor = openIndex;
  while (cursor < value.length) {
    const character = value[cursor];
    if (character === '"' || character === "'") {
      cursor = skipString(value, cursor);
      continue;
    }
    if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor += 1;
  }
  return value.length - 1;
};

const tokenizeCompound = (compound) => {
  const tokens = [];
  let depth = 0;
  let current = '';
  let cursor = 0;
  while (cursor < compound.length) {
    const character = compound[cursor];
    if (character === '[' && depth === 0) {
      if (current !== '') {
        tokens.push(current);
        current = '';
      }
      const close = closingBracket(compound, cursor);
      tokens.push(compound.slice(cursor, close + 1));
      cursor = close + 1;
      continue;
    }
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    const startsPseudoElement = character === ':' && compound[cursor + 1] === ':';
    if (depth === 0 && isDelimiter(character)) {
      if (current !== '') {
        tokens.push(current);
      }
      current = startsPseudoElement ? '::' : character;
      cursor += startsPseudoElement ? 2 : 1;
      continue;
    }
    current += character;
    cursor += 1;
  }
  if (current !== '') {
    tokens.push(current);
  }
  return tokens;
};

const functionalArgument = (token) => {
  const open = token.indexOf('(');
  return open === -1 ? null : token.slice(open + 1, -1);
};

export const parseCompound = (compound) => {
  const parts = [];
  for (const token of tokenizeCompound(compound)) {
    if (token === '::') {
      continue;
    }
    if (token.startsWith(':')) {
      if (token === ':root') {
        parts.push({ kind: 'root' });
      } else if (token === ':only-child') {
        parts.push({ kind: 'onlyChild' });
      } else if (token.startsWith(':not(')) {
        parts.push({ kind: 'none', argument: functionalArgument(token) });
      } else if (token.startsWith(':where(') || token.startsWith(':is(')) {
        parts.push({ kind: 'any', argument: functionalArgument(token) });
      } else if (token.startsWith(':has(')) {
        parts.push({ kind: 'has', argument: functionalArgument(token) });
      } else {
        parts.push({ kind: 'state' });
      }
      continue;
    }
    if (token.startsWith('.')) {
      parts.push({ kind: 'class', name: token.slice(1) });
      continue;
    }
    if (token.startsWith('#')) {
      parts.push({ kind: 'id', name: token.slice(1) });
      continue;
    }
    if (token.startsWith('[')) {
      const inner = token.slice(1, -1);
      const separator = inner.search(/[~^|$*]?=/u);
      parts.push(
        separator === -1
          ? { kind: 'attribute', name: inner }
          : {
              kind: 'attribute',
              name: inner.slice(0, separator),
              value: inner.slice(separator + 1).replaceAll(/^['"]|['"]$/gu, ''),
            },
      );
      continue;
    }
    if (token !== '*') {
      parts.push({ kind: 'type', name: token });
    }
  }
  return parts;
};

const addSpecificity = (left, right) => [
  left[0] + right[0],
  left[1] + right[1],
  left[2] + right[2],
];

export const compareSpecificity = (left, right) =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

const ZERO = [0, 0, 0];

const compoundSpecificity = (compound) => {
  let total = ZERO;
  for (const token of tokenizeCompound(compound)) {
    if (token.startsWith('#')) {
      total = addSpecificity(total, [1, 0, 0]);
    } else if (token.startsWith('.') || token.startsWith('[')) {
      total = addSpecificity(total, [0, 1, 0]);
    } else if (token.startsWith('::')) {
      continue;
    } else if (token.startsWith(':where(')) {
      continue;
    } else if (token.startsWith(':')) {
      const argument = functionalArgument(token);
      if (argument === null) {
        total = addSpecificity(total, [0, 1, 0]);
        continue;
      }
      const best = splitArguments(argument)
        .map((selector) => specificityOf(selector))
        .reduce(
          (winner, candidate) => (compareSpecificity(candidate, winner) > 0 ? candidate : winner),
          ZERO,
        );
      total = addSpecificity(total, best);
    } else if (token !== '*') {
      total = addSpecificity(total, [0, 0, 1]);
    }
  }
  return total;
};

export const specificityOf = (selector) =>
  splitSelector(selector).reduce(
    (total, part) => addSpecificity(total, compoundSpecificity(part.compound)),
    ZERO,
  );
