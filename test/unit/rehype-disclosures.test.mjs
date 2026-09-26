import { expect, test } from 'vitest';
import { rehypeDisclosures } from '../../src/lib/rehype-disclosures.mjs';
import {
  disclosureContentClasses,
  disclosureInnerClasses,
  element,
  text,
} from '../fixtures/rehype-disclosures.fixtures.mjs';

test('wraps non-summary details content while preserving children', () => {
  const firstSummary = element('summary', { className: ['summary'] }, [text('First')]);
  const firstParagraph = element('p', { className: ['body'] }, [text('Body one')]);
  const firstTail = text('tail one');
  const firstLeadingText = text('\n');
  const firstContentLeadingText = text('\n');
  const firstDetails = element('details', { className: ['disclosure'] }, [
    firstLeadingText,
    firstSummary,
    firstContentLeadingText,
    firstParagraph,
    firstTail,
  ]);

  const secondSummary = element('summary', {}, [text('Second')]);
  const secondDetails = element('details', {}, [secondSummary]);
  const tree = { type: 'root', children: [firstDetails, secondDetails] };
  const secondChildren = secondDetails.children;

  rehypeDisclosures()(tree);

  expect(firstDetails.children[0]).toBe(firstLeadingText);
  expect(firstDetails.children[1]).toBe(firstSummary);
  expect(firstDetails.properties.className).toEqual(['disclosure', 'group']);
  expect(firstDetails.children[2]).toEqual({
    type: 'element',
    tagName: 'div',
    properties: { className: disclosureContentClasses },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: disclosureInnerClasses },
        children: [firstContentLeadingText, firstParagraph, firstTail],
      },
    ],
  });
  expect(firstDetails.children[2].children[0].children[0]).toBe(firstContentLeadingText);
  expect(firstDetails.children[2].children[0].children[1]).toBe(firstParagraph);
  expect(firstDetails.children[2].children[0].children[2]).toBe(firstTail);
  expect(secondDetails.children).toBe(secondChildren);
  expect(secondDetails.children[0]).toBe(secondSummary);
});

test('does not double-wrap existing disclosure content', () => {
  const summary = element('summary', {}, [text('Summary')]);
  const paragraph = element('p', {}, [text('Body')]);
  const details = element('details', {}, [summary, paragraph]);

  rehypeDisclosures()(details);
  const transformedChildren = details.children;
  rehypeDisclosures()(details);

  expect(details.properties.className).toEqual(['group']);
  expect(details.children).toBe(transformedChildren);
  expect(details.children).toHaveLength(2);
  expect(details.children[1].tagName).toBe('div');
  expect(details.children[1].properties.className).toEqual(disclosureContentClasses);
  expect(details.children[1].children[0].properties.className).toEqual(disclosureInnerClasses);
});

test('moves siblings into canonical disclosure content in document order', () => {
  const summary = element('summary', {}, [text('Summary')]);
  const before = text('before');
  const insideText = text('inside');
  const insideBodyText = text('body');
  const insideParagraph = element('p', {}, [insideBodyText]);
  const canonical = element('div', { className: ['disclosure-content'] }, [
    element('div', { className: ['disclosure-content-inner'] }, [insideText, insideParagraph]),
  ]);
  const after = text('after');
  const details = element('details', {}, [summary, before, canonical, after]);

  rehypeDisclosures()(details);

  expect(details.children).toEqual([summary, canonical]);
  expect(canonical.children[0].children).toEqual([before, insideText, insideParagraph, after]);

  const contentNodes = [];
  const collect = (node) => {
    if (node.type === 'text' || (node.type === 'element' && node.tagName === 'p')) {
      contentNodes.push(node);
    }
    node.children?.forEach((child) => collect(child));
  };
  details.children.slice(1).forEach((node) => collect(node));

  expect(contentNodes).toEqual([before, insideText, insideParagraph, insideBodyText, after]);
  expect(details.children.filter((node) => node === canonical)).toHaveLength(1);
});

test('leaves details with leading non-whitespace content unchanged', () => {
  const leading = text('intro');
  const summary = element('summary', {}, [text('Summary')]);
  const body = element('p', {}, [text('Body')]);
  const details = element('details', {}, [leading, summary, body]);
  const children = details.children;

  rehypeDisclosures()(details);

  expect(details.children).toBe(children);
  expect(details.children).toEqual([leading, summary, body]);
  expect(details.properties.className).toBeUndefined();
});

test('leaves details without a summary unchanged', () => {
  const body = element('p', {}, [text('Body')]);
  const details = element('details', {}, [body]);
  const children = details.children;

  rehypeDisclosures()(details);

  expect(details.children).toBe(children);
  expect(details.children).toEqual([body]);
  expect(details.properties.className).toBeUndefined();
});

test('leaves details with a summary after content unchanged', () => {
  const before = element('p', {}, [text('Before')]);
  const summary = element('summary', {}, [text('Summary')]);
  const after = element('p', {}, [text('After')]);
  const details = element('details', {}, [before, summary, after]);
  const children = details.children;

  rehypeDisclosures()(details);

  expect(details.children).toBe(children);
  expect(details.children).toEqual([before, summary, after]);
  expect(details.properties.className).toBeUndefined();
});

test('leaves details with multiple summaries unchanged', () => {
  const firstSummary = element('summary', {}, [text('First')]);
  const secondSummary = element('summary', {}, [text('Second')]);
  const body = element('p', {}, [text('Body')]);
  const details = element('details', {}, [firstSummary, secondSummary, body]);
  const children = details.children;

  rehypeDisclosures()(details);

  expect(details.children).toBe(children);
  expect(details.children).toEqual([firstSummary, secondSummary, body]);
  expect(details.properties.className).toBeUndefined();
});

test('leaves malformed canonical disclosure wrappers untouched', () => {
  const summary = element('summary', {}, [text('Summary')]);
  const wrappers = [
    element('div', { className: ['disclosure-content'] }, []),
    element('div', { className: ['disclosure-content'] }, [text('text first')]),
    element('div', { className: ['disclosure-content'] }, [
      element('div', { className: ['other'] }, []),
    ]),
    element('div', { className: ['disclosure-content'] }, [
      element('div', { className: ['disclosure-content-inner'] }),
    ]),
    element('div', { className: ['disclosure-content'] }, [
      element('div', { className: ['disclosure-content-inner'] }, []),
    ]),
    element('div', { className: ['disclosure-content'] }, [
      element('div', { className: ['disclosure-content-inner'] }, {}),
    ]),
  ];

  for (const wrapper of wrappers) {
    const sibling = text('sibling');
    const details = element('details', {}, [summary, wrapper, sibling]);
    const children = details.children;

    expect(() => rehypeDisclosures()(details)).not.toThrow();
    expect(details.children).toBe(children);
    expect(details.children).toEqual([summary, wrapper, sibling]);
  }
});
