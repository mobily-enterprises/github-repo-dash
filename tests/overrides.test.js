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
  useBodyText: false
};

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('getQueryOverrides', () => {
  it('returns empty overrides when no params', () => {
    const o = getQueryOverrides();
    expect(o.repo).toBe('');
    expect(o.hasRepo).toBe(false);
    expect(o.hasUseBodyText).toBe(false);
  });

  it('parses handle and use_body_text=true', () => {
    window.history.replaceState({}, '', '/?handle=bob&use_body_text=true');
    const o = getQueryOverrides();
    expect(o.handle).toBe('@bob');
    expect(o.hasHandle).toBe(true);
    expect(o.useBodyText).toBe(true);
    expect(o.hasUseBodyText).toBe(true);
  });

  it('parses use_body_text=false', () => {
    window.history.replaceState({}, '', '/?use_body_text=false');
    const o = getQueryOverrides();
    expect(o.useBodyText).toBe(false);
    expect(o.hasUseBodyText).toBe(true);
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
