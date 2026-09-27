/**
 * Frozen-content safety for the two remark plugins that rewrite prose.
 *
 * `remarkMeasuredValues` and `remarkCitations` inject markup into the document.
 * DESIGN.md and the surface brief both freeze all 37 files: wording, citations
 * and order are exactly as authored. That makes these two plugins the only place
 * in the build where the shipped text can change, and nothing pinned them —
 * `content-corpus.test.mjs` only checks the transform is idempotent, which stays
 * true for a regex that has started wrapping the wrong numbers or reaching
 * inside code fences.
 *
 * So the invariants are asserted directly against the transforms.
 */
import { describe, expect, test } from 'vitest';
import { remarkCitations, remarkMeasuredValues } from '../../src/lib/remark-measured.mjs';

const run = (plugin, tree) => plugin()(tree);

/** Every node of a given type, in document order. */
function collect(node, type, found = []) {
  if (!node || typeof node !== 'object') {
    return found;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      collect(child, type, found);
    }
    return found;
  }
  if (node.type === type) {
    found.push(node);
  }
  if (Array.isArray(node.children)) {
    collect(node.children, type, found);
  }
  return found;
}

/**
 * Reconstruct the string a reader SEES, and nothing else.
 *
 * A `text` node contributes its value. An `html` node contributes only what is
 * inside its element — so the injected wrapper markup is stripped and its
 * payload is kept. Anything that is not a single `<span>…</span>` contributes
 * the empty string, which means a plugin that injected a whole paragraph, or
 * swallowed content, shows up as a wording change rather than passing quietly.
 */
const SPAN = /^<span class="[a-z-]+">([^<>]*)<\/span>$/u;

function renderedText(node) {
  if (!node || typeof node !== 'object') {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map((child) => renderedText(child)).join('');
  }
  if (node.type === 'text' || node.type === 'code' || node.type === 'inlineCode') {
    return typeof node.value === 'string' ? node.value : '';
  }
  if (node.type === 'html') {
    return SPAN.exec(node.value)?.[1] ?? '';
  }
  if (Array.isArray(node.children)) {
    return renderedText(node.children);
  }
  return '';
}

const paragraph = (value) => ({
  type: 'paragraph',
  children: [{ type: 'text', value }],
});

const ROOT = 'root';

/** The shape a markdown citation link arrives in. */
const citationLink = (label) => ({
  type: 'link',
  url: '#s29',
  children: [{ type: 'text', value: label }],
});

/** The `html` nodes a transform injected, in order. */
const injected = (node) => collect(node, 'html').map((child) => child.value);

describe('remarkMeasuredValues — wording is untouched', () => {
  test('reproduces the input string byte for byte', () => {
    const inputs = [
      'E-Rows 1,000 versus A-Rows 12,000 in 5ms, a 42x spread, 1.5 K rows, 3 M rows.',
      'The canonical plan carries E-Rows=1.2M where the index had E-Rows=250K.',
      'Run 4 times over 250 seconds at 99.9 percentile.',
      'Nothing numeric lives in this sentence.',
    ];

    for (const input of inputs) {
      const tree = { type: ROOT, children: [paragraph(input)] };
      run(remarkMeasuredValues, tree);
      expect(renderedText(tree), `wording changed for: ${input}`).toBe(input);
    }
  });

  test('wraps the measured values it is supposed to wrap', () => {
    const tree = {
      type: ROOT,
      children: [
        paragraph('E-Rows 1,000 versus A-Rows 12,000 in 5ms, a 42x spread.'),
        paragraph('The plan carries E-Rows=1.2M.'),
      ],
    };

    run(remarkMeasuredValues, tree);
    const measured = injected(tree);

    /* `1,000` and `12,000` are the same quantity and must be treated alike. */
    expect(measured).toEqual([
      '<span class="measured">1,000</span>',
      '<span class="measured">12,000</span>',
      '<span class="measured">5ms</span>',
      '<span class="measured">42x</span>',
      '<span class="measured">E-Rows=1.2M</span>',
    ]);
  });
});

describe('remarkMeasuredValues — code is never annotated', () => {
  test('never reaches inside a fenced code block', () => {
    const fence = 'SELECT /* 12,000 rows */ 5ms E-Rows=1.2M 42x';
    const tree = {
      type: ROOT,
      children: [
        { type: 'code', lang: 'sql', value: fence },
        paragraph('Outside the fence: 12,000 rows in 5ms.'),
      ],
    };

    run(remarkMeasuredValues, tree);

    expect(collect(tree, 'code')).toHaveLength(1);
    expect(collect(tree, 'code').at(0).value).toBe(fence);
    /* Both wraps come from the prose paragraph, neither from the fence. */
    expect(injected(tree)).toEqual([
      '<span class="measured">12,000</span>',
      '<span class="measured">5ms</span>',
    ]);
  });

  test('never reaches inside an inline code span', () => {
    const span = 'COUNT(*) = 12,000 in 5ms';
    const tree = {
      type: ROOT,
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Run ' },
            { type: 'inlineCode', value: span },
            { type: 'text', value: ' and compare 5ms.' },
          ],
        },
      ],
    };

    run(remarkMeasuredValues, tree);

    expect(collect(tree, 'inlineCode').at(0).value).toBe(span);
    expect(injected(tree)).toEqual(['<span class="measured">5ms</span>']);
  });
});

describe('remarkMeasuredValues — what it deliberately skips', () => {
  test('leaves prose with no measured value completely untouched', () => {
    const sentence = 'Nothing numeric lives in this sentence.';
    const tree = { type: ROOT, children: [paragraph(sentence)] };
    const before = JSON.stringify(tree);

    run(remarkMeasuredValues, tree);

    expect(JSON.stringify(tree)).toBe(before);
    expect(renderedText(tree)).toBe(sentence);
  });

  test('does not mark a heading, so slug generation is not perturbed', () => {
    /*
     * `rehype-slug` builds a heading's `id` from `toString(node)`, and for an
     * `html` node `toString` returns the RAW SOURCE — so an injected
     * `<span class="measured">12,000</span>` would go into the slug, producing an
     * id full of angle brackets and breaking the deep link the section TOC
     * depends on.
     */
    const tree = {
      type: ROOT,
      children: [
        {
          type: 'heading',
          depth: 2,
          children: [{ type: 'text', value: 'Measure 12,000 rows in 5ms' }],
        },
      ],
    };

    run(remarkMeasuredValues, tree);

    expect(tree.children.at(0).type).toBe('heading');
    expect(tree.children.at(0).children).toHaveLength(1);
    expect(injected(tree)).toHaveLength(0);
    expect(renderedText(tree)).toBe('Measure 12,000 rows in 5ms');
  });
});

describe('remarkCitations — only citation links are marked', () => {
  test('marks a citation link and nothing else', () => {
    const prose = {
      type: ROOT,
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Grades are defined in ' },
            citationLink('S29'),
            { type: 'text', value: ', the runbook is in ' },
            citationLink('T-05'),
            { type: 'text', value: ', and that is all.' },
          ],
        },
      ],
    };

    run(remarkCitations, prose);

    const links = collect(prose, 'link').filter((node) => node.data?.hProperties?.className);
    expect(links).toHaveLength(2);
    expect(renderedText(prose)).toBe(
      'Grades are defined in S29, the runbook is in T-05, and that is all.',
    );
  });

  test('does not reach inside code', () => {
    const tree = {
      type: ROOT,
      children: [
        { type: 'code', lang: 'text', value: 'S29 T-05' },
        { type: 'paragraph', children: [citationLink('S29')] },
      ],
    };

    run(remarkCitations, tree);

    expect(collect(tree, 'code').at(0).value).toBe('S29 T-05');
    expect(collect(tree, 'link').at(0).data?.hProperties?.className).toBe('citation');
  });
});

describe('remarkCitations — what it leaves alone', () => {
  test('does not mark an ordinary prose link', () => {
    const tree = {
      type: ROOT,
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Read ' },
            citationLink('the runbook'),
            { type: 'text', value: ' first.' },
          ],
        },
      ],
    };

    run(remarkCitations, tree);

    expect(collect(tree, 'link').at(0).data?.hProperties).toBeUndefined();
  });

  test('leaves a tree with no citation link completely untouched', () => {
    const tree = { type: ROOT, children: [paragraph('See the runbook for the full list.')] };
    const before = JSON.stringify(tree);

    run(remarkCitations, tree);

    expect(JSON.stringify(tree)).toBe(before);
  });
});
