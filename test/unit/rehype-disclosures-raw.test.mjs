import { expect, test } from 'vitest';
import { rehypeDisclosures } from '../../src/lib/rehype-disclosures.mjs';
import {
  element,
  expectCanonicalDisclosure,
  htmlNode,
  rawHtml,
  text,
} from '../fixtures/rehype-disclosures.fixtures.mjs';

const detailsMarkup = (summary, body = 'Body') =>
  `<details><summary>${summary}</summary><p>${body}</p></details>`;

const rootWith = (...children) => ({ type: 'root', children });

test('expands raw HTML nodes that contain a details element', () => {
  const node = rawHtml(detailsMarkup('Raw'));
  const tree = rootWith(node);
  const children = tree.children;

  rehypeDisclosures()(tree);

  expect(tree.children).toBe(children);
  expect(children).toHaveLength(1);
  expect(children[0]).not.toBe(node);
  expectCanonicalDisclosure(children[0]);
  expect(children[0].children[1].children[0].children[0].tagName).toBe('p');
});

test('expands html typed raw nodes that contain a details element', () => {
  const tree = rootWith(htmlNode(detailsMarkup('Raw')));

  rehypeDisclosures()(tree);

  expect(tree.children[0].type).toBe('element');
  expectCanonicalDisclosure(tree.children[0]);
});

test('leaves raw HTML nodes without details untouched', () => {
  const untouched = [
    rawHtml('<div class="callout"><p>Plain</p></div>'),
    rawHtml('<span>inline</span>'),
    rawHtml('<!-- comment -->'),
    rawHtml('&lt;details&gt;escaped&lt;/details&gt;'),
  ];
  const tree = rootWith(...untouched);

  rehypeDisclosures()(tree);

  expect(tree.children).toEqual(untouched);
  for (const [index, node] of untouched.entries()) {
    expect(tree.children[index]).toBe(node);
  }
});

test('expands several raw details fragments in one tree', () => {
  const plain = rawHtml('<em>kept</em>');
  const tree = rootWith(
    rawHtml(detailsMarkup('One', 'First')),
    plain,
    rawHtml(detailsMarkup('Two', 'Second')),
  );

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(3);
  expect(tree.children[1]).toBe(plain);
  expectCanonicalDisclosure(tree.children[0]);
  expectCanonicalDisclosure(tree.children[2]);
  expect(tree.children[0].children[0].children[0].value).toBe('One');
  expect(tree.children[2].children[0].children[0].value).toBe('Two');
});

test('parses only the raw fragment so wrappers around details survive', () => {
  const tree = rootWith(rawHtml(`<div class="wrap">${detailsMarkup('Nested')}</div>`));

  rehypeDisclosures()(tree);

  const [wrapper] = tree.children;
  expect(wrapper.tagName).toBe('div');
  expect(wrapper.properties.className).toEqual(['wrap']);
  expect(wrapper.children).toHaveLength(1);
  expectCanonicalDisclosure(wrapper.children[0]);
});

test('expands raw details nested alongside already parsed element details', () => {
  const parsed = element('details', {}, [
    element('summary', {}, [text('Parsed')]),
    element('p', {}, [text('Parsed body')]),
  ]);
  const tree = rootWith(parsed, rawHtml(detailsMarkup('Raw', 'Raw body')));

  rehypeDisclosures()(tree);

  expect(tree.children[0]).toBe(parsed);
  expectCanonicalDisclosure(parsed);
  expectCanonicalDisclosure(tree.children[1]);
});

test('raw details expansion is idempotent across repeated passes', () => {
  const tree = rootWith(rawHtml(detailsMarkup('Raw')));

  rehypeDisclosures()(tree);
  const afterFirst = tree.children;
  const firstDetails = afterFirst[0];

  rehypeDisclosures()(tree);
  rehypeDisclosures()(tree);

  expect(tree.children).toBe(afterFirst);
  expect(tree.children).toHaveLength(1);
  expect(tree.children[0]).toBe(firstDetails);
  expectCanonicalDisclosure(tree.children[0]);
});

test('matches details markup regardless of case and attributes', () => {
  const tree = rootWith(
    rawHtml('<DETAILS class="x"><SUMMARY>Upper</SUMMARY><p>Body</p></DETAILS>'),
    rawHtml('<details open><summary>Attr</summary><p>Body</p></details>'),
  );

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(2);
  expectCanonicalDisclosure(tree.children[0]);
  expectCanonicalDisclosure(tree.children[1]);
});

const markdownSplitDetails = () => {
  const firstParagraph = element('p', {}, [text('One')]);
  const secondParagraph = element('p', {}, [text('Two')]);
  const closing = rawHtml('</details>');
  const after = element('p', {}, [text('After')]);
  return {
    firstParagraph,
    secondParagraph,
    closing,
    after,
    tree: rootWith(
      rawHtml('<details><summary>Split</summary>'),
      firstParagraph,
      secondParagraph,
      closing,
      after,
    ),
  };
};

test('absorbs following siblings when the raw details block is not closed in one node', () => {
  const { firstParagraph, secondParagraph, closing, after, tree } = markdownSplitDetails();

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(2);
  expect(tree.children[1]).toBe(after);
  expectCanonicalDisclosure(tree.children[0]);

  const inner = tree.children[0].children[1].children[0].children;
  expect(inner.filter((node) => node.tagName === 'p')).toEqual([firstParagraph, secondParagraph]);
  expect(closing).not.toBe(after);
  expect(
    JSON.stringify(tree, (key, value) => (key === 'position' ? undefined : value)),
  ).not.toContain('raw');
});

test('an unclosed raw details block absorbs every remaining sibling', () => {
  const firstParagraph = element('p', {}, [text('Only')]);
  const tree = rootWith(rawHtml('<details><summary>Bare</summary>'), firstParagraph);

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(1);
  expectCanonicalDisclosure(tree.children[0]);
  expect(tree.children[0].children[1].children[0].children).toContain(firstParagraph);
});

test('a self-contained raw details block does not absorb later siblings', () => {
  const trailing = element('p', {}, [text('Trailing')]);
  const tree = rootWith(rawHtml(detailsMarkup('Closed', 'Inside')), trailing);

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(2);
  expect(tree.children[1]).toBe(trailing);
  expectCanonicalDisclosure(tree.children[0]);
  const inner = tree.children[0].children[1].children[0].children;
  expect(inner.some((node) => node === trailing)).toBe(false);
});

test('raw HTML that closes someone else else block is left alone', () => {
  const paragraph = element('p', {}, [text('Body')]);
  const stray = rawHtml('</details>');
  const tree = rootWith(paragraph, stray);

  rehypeDisclosures()(tree);

  expect(tree.children).toHaveLength(2);
  expect(tree.children[0]).toBe(paragraph);
  expect(tree.children[1]).toBe(stray);
});
