import { describe, it, expect } from 'vitest';
import { createEl, ensureAt } from '../docs/utils.js';

describe('utils branch coverage', () => {
  it('createEl leaves class empty when not provided', () => {
    const el = createEl('div');
    expect(el.className).toBe('');
  });

  it('ensureAt prepends @ when missing', () => {
    expect(ensureAt('alice')).toBe('@alice');
  });
});
