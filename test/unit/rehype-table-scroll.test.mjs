/**
 * `rehypeTableScroll` — the table scroll container, built in the tree.
 *
 * See `src/lib/rehype-table-scroll.mjs` for why this cannot be done in CSS: the
 * table has to scroll horizontally AND fill the 68ch measure, and no
 * `display`/`overflow`/`width` combination provides both.
 */
import { describe, expect, test } from 'vitest';
import { WRAPPER_CLASS, rehypeTableScroll } from '../../src/lib/rehype-table-scroll.mjs';

const el = (tagName, properties = {}, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const text = (value) => ({ type: 'text', value });

/** The shape markdown produces for a GFM table. */
const table = () =>
  el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [el('th', {}, [text('Grade')]), el('th', {}, [text('Source')])]),
    ]),
    el('tbody', {}, [el('tr', {}, [el('td', {}, [text('A1')]), el('td', {}, [text('Oracle')])])]),
  ]);

/** The shape markdown produces for an inline table nested in a cell. */
const nestedTable = () => el('td', {}, [table()]);

const wrap = (tree) => {
  rehypeTableScroll()(tree);
  return tree;
};

/** The tags of a node's direct children, in order. */
const childTags = (node) => node.children.map((child) => child.tagName ?? child.type);

describe('rehypeTableScroll', () => {
  test('wraps a top-level table in a scroll container', () => {
    const tree = wrap({ type: 'root', children: [el('p', {}, [text('Before')]), table()] });

    expect(childTags(tree)).toEqual(['p', 'div']);
    const [wrapper] = tree.children.slice(1);
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties.className).toEqual([WRAPPER_CLASS]);
    expect(childTags(wrapper)).toEqual(['table']);
  });

  test('keeps the table as the SAME node, so no markup is rebuilt', () => {
    const original = table();
    const tree = wrap({ type: 'root', children: [original] });

    /* Identity, not equality: the transform must move the existing node rather
     * than serialise and re-parse it, or it is one more place the frozen content
     * could change shape. */
    expect(tree.children[0].children[0]).toBe(original);
  });
});

describe('rehypeTableScroll — idempotence and nesting', () => {
  test('does not wrap a table already inside a wrapper', () => {
    const first = wrap({ type: 'root', children: [table()] });
    const second = wrap(first);

    expect(childTags(second)).toEqual(['div']);
    expect(childTags(second.children[0])).toEqual(['table']);
  });

  test('does not nest a second wrapper around a table inside a cell', () => {
    const tree = wrap({
      type: 'root',
      children: [
        el('table', {}, [
          el('tbody', {}, [el('tr', {}, [nestedTable(), el('td', {}, [text('x')])])]),
        ]),
      ],
    });

    /* One wrapper for the outer table, and the inner one stays a bare `<table>`
     * — it is already inside a scroll container, and a second one would give it
     * a nested axis of its own. */
    expect(childTags(tree)).toEqual(['div']);
    const outer = tree.children[0].children[0];
    const row = outer.children[0].children[0];
    const innerCell = row.children[0];
    expect(innerCell.tagName).toBe('td');
    expect(childTags(innerCell)).toEqual(['table']);
  });
});

describe('rehypeTableScroll — documents it does not change', () => {
  test('leaves a document with no table untouched', () => {
    const tree = {
      type: 'root',
      children: [el('p', {}, [text('Nothing here.')]), el('ul', {}, [el('li', {}, [text('a')])])],
    };
    const before = JSON.stringify(tree);

    wrap(tree);

    expect(JSON.stringify(tree)).toBe(before);
  });

  test('tolerates text and comment siblings around the table', () => {
    const tree = wrap({
      type: 'root',
      children: [
        text('loose'),
        table(),
        el('p', {}, [text('after')]),
        { type: 'comment', value: ' trailing' },
      ],
    });

    /* Nothing is dropped or reordered: the table gains a parent and everything
     * around it keeps its position. */
    expect(childTags(tree)).toEqual(['text', 'div', 'p', 'comment']);
    expect(tree.children[0].value).toBe('loose');
    expect(tree.children[1].children[0].tagName).toBe('table');
    expect(tree.children[2].children[0].value).toBe('after');
    expect(tree.children[3].value).toBe(' trailing');
  });

  test('wraps several tables independently', () => {
    const tree = wrap({ type: 'root', children: [table(), table(), table()] });

    expect(childTags(tree)).toEqual(['div', 'div', 'div']);
    for (const wrapper of tree.children) {
      expect(wrapper.properties.className).toEqual([WRAPPER_CLASS]);
    }
  });

  test('is a no-op on a node with no children', () => {
    expect(() => wrap({ type: 'root' })).not.toThrow();
    expect(() => wrap({ type: 'root', children: [] })).not.toThrow();
  });
});
