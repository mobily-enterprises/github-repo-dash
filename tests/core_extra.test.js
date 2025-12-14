import { describe, it, expect, beforeEach } from 'vitest';

import { getQueryOverrides } from '../docs/core.js';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides use_body parsing', () => {
  it('treats missing use_body as absent', () => {
    const o = getQueryOverrides();
    expect(o.hasUseBody).toBe(false);
    expect(o.useBody).toBe(null);
  });

  it('handles unknown use_body value as falsey override', () => {
    window.history.replaceState({}, '', '/?use_body=maybe');
    const o = getQueryOverrides();
    expect(o.useBody).toBe(false);
    expect(o.hasUseBody).toBe(true);
  });
});
