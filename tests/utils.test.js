import { describe, it, expect } from 'vitest';

import { normalizeHandle, isValidRepo } from '../docs/utils.js';
import { REPO_REGEX } from '../docs/config.js';

describe('normalizeHandle', () => {
  it('adds @ and trims whitespace', () => {
    expect(normalizeHandle(' alice ')).toBe('@alice');
  });

  it('returns default when empty', () => {
    expect(normalizeHandle('', '@me')).toBe('@me');
  });
});

describe('isValidRepo', () => {
  it('accepts owner/repo', () => {
    expect(isValidRepo('foo/bar', REPO_REGEX)).toBe(true);
  });

  it('rejects missing owner', () => {
    expect(isValidRepo('bar', REPO_REGEX)).toBe(false);
  });
});
