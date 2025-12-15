import { describe, it, expect, beforeEach } from 'vitest';

import { getQueryOverrides, buildQuery } from '../docs/core.js';

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

describe('buildQuery template selection and DRI label expansions', () => {
  const baseState = {
    repo: 'org/repo',
    driToken: 'DRI:@',
    handle: '@me',
    handleBare: 'me',
    useBodyText: false
  };

  it('falls back to label template when body template missing', () => {
    const cfg = { queryUsingLabels: 'only-label-template __HANDLE_BARE__' };
    const q = buildQuery(cfg, { ...baseState, useBodyText: true });
    expect(q).toContain('only-label-template me');
  });

  it('expands __DRI_LABELS_OR__ and __DRI_LABELS_NOT__ for empty and multi label sets', () => {
    const cfg = { queryUsingLabels: '__DRI_LABELS_OR__ __DRI_LABELS_NOT__' };
    const empty = buildQuery(cfg, baseState, { driLabels: [] });
    expect(empty).toContain('label:"__none__"');
    expect(empty).not.toContain('-label');

    const multi = buildQuery(cfg, baseState, { driLabels: ['DRI:@a', 'DRI:@b'] });
    expect(multi).toContain('label:"DRI:@a","DRI:@b"');
    expect(multi).toContain('-label:"DRI:@a"');
    expect(multi).toContain('-label:"DRI:@b"');
  });

  it('falls back to body template when label template missing', () => {
    const cfg = { queryUsingBodyText: 'only-body-template __HANDLE_BARE__' };
    const q = buildQuery(cfg, { ...baseState, useBodyText: false });
    expect(q).toContain('only-body-template me');
  });

  it('returns empty query string when no templates exist', () => {
    const cfg = {};
    const q = buildQuery(cfg, { ...baseState, repo: '' });
    expect(q).toBe('');
  });
});
