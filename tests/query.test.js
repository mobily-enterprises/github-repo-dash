import { describe, it, expect } from 'vitest';

import { buildQuery } from '../docs/core.js';
import { DEFAULTS } from '../docs/config.js';

const baseState = {
  repo: 'owner/repo',
  driToken: 'DRI:@',
  handle: '@alice',
  handleBare: 'alice',
  coderBodyFlag: DEFAULTS.coderBodyFlag,
  coderLabelFlag: DEFAULTS.coderLabelFlag,
  useBodyText: false
};

const cfg = {
  queryUsingLabels: 'is:pr label:"__DRI__" assignee:__HANDLE_BARE__',
  queryUsingBodyText: 'is:pr in:body "__DRI__" assignee:__HANDLE_BARE__'
};

describe('buildQuery', () => {
  it('prefixes repo and uses labels by default', () => {
    const q = buildQuery(cfg, baseState);
    expect(q).toBe('repo:owner/repo is:pr label:"DRI:@" assignee:alice');
  });

  it('uses body when useBodyText is true', () => {
    const q = buildQuery(cfg, { ...baseState, useBodyText: true });
    expect(q).toBe('repo:owner/repo is:pr in:body "DRI:@" assignee:alice');
  });

  it('drops repo prefix when missing', () => {
    const q = buildQuery(cfg, { ...baseState, repo: '' });
    expect(q.startsWith('repo:')).toBe(false);
  });
});
