import { describe, it, expect, beforeEach } from 'vitest';

import { getQueryOverrides } from '../docs/core.js';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides use_body_text parsing', () => {
  it('treats missing use_body_text as absent', () => {
    const o = getQueryOverrides();
    expect(o.hasUseBodyText).toBe(false);
    expect(o.useBodyText).toBe(null);
  });

  it('handles unknown use_body_text value as falsey override', () => {
    window.history.replaceState({}, '', '/?use_body_text=maybe');
    const o = getQueryOverrides();
    expect(o.useBodyText).toBe(false);
    expect(o.hasUseBodyText).toBe(true);
  });
});
