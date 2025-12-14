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
  useLabels: false
};

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides', () => {
  it('returns empty overrides when no params', () => {
    const o = getQueryOverrides();
    expect(o.repo).toBe('');
    expect(o.hasRepo).toBe(false);
    expect(o.hasUseLabels).toBe(false);
  });

  it('parses handle and use_labels=true', () => {
    window.history.replaceState({}, '', '/?handle=bob&use_labels=true');
    const o = getQueryOverrides();
    expect(o.handle).toBe('@bob');
    expect(o.hasHandle).toBe(true);
    expect(o.useLabels).toBe(true);
    expect(o.hasUseLabels).toBe(true);
  });

  it('parses use_labels=false', () => {
    window.history.replaceState({}, '', '/?use_labels=false');
    const o = getQueryOverrides();
    expect(o.useLabels).toBe(false);
    expect(o.hasUseLabels).toBe(true);
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
