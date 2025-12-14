import { describe, it, expect } from 'vitest';

import { createEl, setListPlaceholder, ensureAt, escapeRegExp } from '../docs/utils.js';

describe('DOM helpers', () => {
  it('creates element with class and text', () => {
    const el = createEl('div', 'foo', 'bar');
    expect(el.className).toBe('foo');
    expect(el.textContent).toBe('bar');
  });

  it('sets list placeholder', () => {
    const ul = document.createElement('ul');
    setListPlaceholder(ul, 'Empty');
    expect(ul.children.length).toBe(1);
    expect(ul.textContent).toBe('Empty');
  });
});

describe('basic utils', () => {
  it('ensureAt returns not found for falsy', () => {
    expect(ensureAt('')).toBe('not found');
  });

  it('escapeRegExp escapes special chars', () => {
    const escaped = escapeRegExp('a.b*c');
    expect(escaped).toBe('a\\.b\\*c');
  });
});
