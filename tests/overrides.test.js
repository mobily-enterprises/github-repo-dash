import { describe, it, expect, beforeEach } from 'vitest';

import { getQueryOverrides, buildQuery } from '../docs/core.js';
import { DEFAULTS } from '../docs/config.js';

const baseState = {
  repo: 'owner/repo',
  driToken: 'DRI:@',
  handle: '@jane',
  handleBare: 'jane',
  coderBodyFlag: DEFAULTS.coderBodyFlag,
  coderLabelFlag: DEFAULTS.coderLabelFlag,
  useBody: false
};

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides', () => {
  it('returns empty overrides when no params', () => {
    const o = getQueryOverrides();
    expect(o.repo).toBe('');
    expect(o.hasRepo).toBe(false);
    expect(o.hasUseBody).toBe(false);
  });

  it('parses handle and use_body=true', () => {
    window.history.replaceState({}, '', '/?handle=bob&use_body=true');
    const o = getQueryOverrides();
    expect(o.handle).toBe('@bob');
    expect(o.hasHandle).toBe(true);
    expect(o.useBody).toBe(true);
    expect(o.hasUseBody).toBe(true);
  });

  it('parses use_body=false', () => {
    window.history.replaceState({}, '', '/?use_body=false');
    const o = getQueryOverrides();
    expect(o.useBody).toBe(false);
    expect(o.hasUseBody).toBe(true);
  });
});

describe('buildQuery with DRI handle replacement', () => {
  it('replaces __DRI_HANDLE__ correctly', () => {
    const cfg = { query: 'is:pr __DRI_HANDLE__ -assignee:__HANDLE_BARE__' };
    const q = buildQuery(cfg, baseState);
    expect(q).toContain('label:"DRI:@jane"');
    expect(q).toContain('assignee:jane');
  });
});
