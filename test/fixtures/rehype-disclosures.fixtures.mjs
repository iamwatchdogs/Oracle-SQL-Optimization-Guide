import { expect } from 'vitest';

export const disclosureContentClasses = ['disclosure-content', 'disclosure-flow'];
export const disclosureInnerClasses = ['disclosure-content-inner', 'disclosure-flow-inner'];

export const text = (value) => ({ type: 'text', value });

export const element = (tagName, properties, children) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

export const rawHtml = (value) => ({ type: 'raw', value });

export const htmlNode = (value) => ({ type: 'html', value });

export const expectCanonicalDisclosure = (details) => {
  expect(details.type).toBe('element');
  expect(details.tagName).toBe('details');
  expect(details.properties.className).toContain('group');
  expect(details.children).toHaveLength(2);
  expect(details.children[0].tagName).toBe('summary');
  expect(details.children[1].tagName).toBe('div');
  expect(details.children[1].properties.className).toEqual(disclosureContentClasses);
  expect(details.children[1].children[0].properties.className).toEqual(disclosureInnerClasses);
};
