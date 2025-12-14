import { describe, it, expect, beforeEach } from 'vitest';
import { getQueryOverrides } from '../docs/core.js';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides use_labels parsing', () => {
  it('treats missing use_labels as absent', () => {
    const o = getQueryOverrides();
    expect(o.hasUseLabels).toBe(false);
    expect(o.useLabels).toBe(null);
  });

  it('handles unknown use_labels value as falsey override', () => {
    window.history.replaceState({}, '', '/?use_labels=maybe');
    const o = getQueryOverrides();
    expect(o.useLabels).toBe(false);
    expect(o.hasUseLabels).toBe(true);
  });
});
