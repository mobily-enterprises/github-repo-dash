import { describe, it, expect, beforeEach } from 'vitest';
import { getQueryOverrides } from '../docs/core.js';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides branch coverage', () => {
  it('handles empty repo/dri/handle inputs (trimming to empty)', () => {
    window.history.replaceState({}, '', '/?repo=%20&dri_token=%20&handle=%20');
    const o = getQueryOverrides();
    expect(o.repo).toBe('');
    expect(o.dri).toBe('');
    expect(o.handle).toBe('');
  });

  it('handles use_labels invalid value but counts as provided', () => {
    window.history.replaceState({}, '', '/?use_labels=maybe');
    const o = getQueryOverrides();
    expect(o.useLabels).toBe(false);
    expect(o.hasUseLabels).toBe(true);
  });
});
