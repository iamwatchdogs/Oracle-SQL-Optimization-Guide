import { expect, test } from 'vitest';
import {
  buildController,
  createFakeNode,
  createHarness,
  runPageLoad,
} from '../fixtures/reading-toc.fixtures.mjs';

const link = (id, text) => createFakeNode({ dataset: { tocLink: id, active: 'false' }, text });

test('keeps hash synchronization and aria-current state', () => {
  const intro = link('intro', 'Intro');
  const other = link('other', 'Other');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro, other],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro', rect: { top: 800, bottom: 900 } })],
      ['other', createFakeNode({ id: 'other', rect: { top: 100, bottom: 200 } })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    hash: '#other',
  });

  expect(intro.dataset.active).toBe('false');
  expect(intro.getAttribute('aria-current')).toBeNull();
  expect(other.dataset.active).toBe('true');
  expect(other.getAttribute('aria-current')).toBe('location');
  expect(currentLabel.textContent).toBe('Other');
});

test('a percent-encoded hash is decoded before it is matched', () => {
  const intro = link('intro', 'Intro');
  const spaced = link('a b&c', 'Spaced heading');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro, spaced],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro' })],
      ['a b&c', createFakeNode({ id: 'a b&c' })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    hash: '#a%20b%26c',
  });

  expect(spaced.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Spaced heading');
});

test('a hash naming no heading leaves every link alone', () => {
  const intro = createFakeNode({ dataset: { tocLink: 'intro', active: 'true' }, text: 'Intro' });
  const other = createFakeNode({ dataset: { tocLink: 'other', active: 'true' }, text: 'Other' });
  const currentLabel = createFakeNode({ text: 'Intro' });

  runPageLoad({
    links: [intro, other],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro', rect: { top: 100, bottom: 200 } })],
      ['other', createFakeNode({ id: 'other', rect: { top: 800, bottom: 900 } })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    hash: '#not-a-heading',
  });

  /* The old code called `setActiveState` unconditionally, so a stale or
   * external fragment blanked every link and cleared the announcement. */
  expect(intro.dataset.active).toBe('true');
  expect(other.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Intro');
});

test('a malformed percent-encoded hash falls back to the raw fragment', () => {
  const intro = link('intro', 'Intro');
  const broken = link('100%', 'Hundred');
  const currentLabel = createFakeNode();

  runPageLoad({
    links: [intro, broken],
    sections: new Map([
      ['intro', createFakeNode({ id: 'intro' })],
      ['100%', createFakeNode({ id: '100%' })],
    ]),
    currentLabel,
    mobile: createFakeNode(),
    hash: '#100%',
  });

  expect(broken.dataset.active).toBe('true');
  expect(currentLabel.textContent).toBe('Hundred');
});

test('a digit-leading hash matches through the same scan fallback', () => {
  const numeric = link('1-choose-one-target', 'Choose one target');
  const currentLabel = createFakeNode();
  const { documentRef, Observer, windowRef } = createHarness({
    links: [numeric],
    sections: new Map([['1-choose-one-target', createFakeNode({ id: '1-choose-one-target' })]]),
    currentLabel,
    mobile: createFakeNode(),
    hash: '#1-choose-one-target',
  });

  buildController({ documentRef, Observer, windowRef }).pageLoad();

  expect(documentRef.invalidSelectorQueries).toBe(1);
  expect(numeric.dataset.active).toBe('true');
  expect(numeric.getAttribute('aria-current')).toBe('location');
});
