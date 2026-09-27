import { describe, expect, test } from 'vitest';
import { rehypeTaskLabels } from '../../src/lib/rehype-task-label.mjs';

const li = (children) => ({ type: 'element', tagName: 'li', properties: {}, children });

const checkbox = (extra = {}) => ({
  type: 'element',
  tagName: 'input',
  properties: { type: 'checkbox', disabled: true, ...extra },
  children: [],
});

const text = (value) => ({ type: 'text', value });

const run = (node) => rehypeTaskLabels()({ type: 'root', children: [node] }, {});

describe('rehypeTaskLabels', () => {
  test('names a bare checkbox from its own item text', () => {
    const item = li([checkbox(), text(' I have a named owner.')]);
    run(item);

    expect(item.children[0].properties['aria-label']).toBe('I have a named owner.');
  });

  test('flattens inline markup so the name matches what the reader sees', () => {
    const item = li([
      checkbox(),
      text(' I use a dedicated lab user and '),
      { type: 'element', tagName: 'code', properties: {}, children: [text('V$INSTANCE')] },
      text('.'),
    ]);
    run(item);

    expect(item.children[0].properties['aria-label']).toBe(
      'I use a dedicated lab user and V$INSTANCE.',
    );
  });

  test('adds no empty name when the item has no text to name it with', () => {
    /*
     * An `aria-label=""` is worse than no name at all: it announces the checkbox as
     * an unlabelled control rather than letting the visible sentence be its label.
     */
    const item = li([checkbox()]);
    run(item);

    expect(item.children[0].properties['aria-label']).toBeUndefined();
  });
});

describe('rehypeTaskLabels — items it should leave alone', () => {
  test('leaves an existing label alone', () => {
    const item = li([checkbox({ 'aria-label': 'Already named' }), text(' Some text.')]);
    run(item);

    expect(item.children[0].properties['aria-label']).toBe('Already named');
  });

  test('ignores list items with no checkbox', () => {
    const item = li([text(' Just a sentence.')]);
    run(item);

    expect(item.children).toHaveLength(1);
  });

  test('truncates a very long item rather than naming a paragraph', () => {
    const item = li([checkbox(), text(' word '.repeat(80))]);
    run(item);

    const label = item.children[0].properties['aria-label'];
    expect(label.length).toBeLessThanOrEqual(160);
    expect(label.endsWith('word')).toBe(true);
  });
});
