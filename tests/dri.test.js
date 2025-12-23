import { describe, it, expect } from 'vitest';

import { extractDri, formatDri, formatAssignee, resolveCoderHandle } from '../docs/dri.js';

const baseOpts = { driToken: 'DRI:@', coderBodyFlag: 'coder', coderLabelFlag: 'op_mia' };

describe('extractDri', () => {
  it('finds DRI in labels and marks reviewer by default', () => {
    const item = { user: { login: 'bob' }, labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri).toEqual({ handle: '@alice', role: 'review' });
  });

  it('marks coder when DRI matches author', () => {
    const item = { user: { login: 'alice' }, labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri.role).toBe('code');
  });

  it('marks coder when coder label is present', () => {
    const item = { user: { login: 'charlie' }, labels: [{ name: 'DRI:@alice' }, { name: 'op_mia' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri.role).toBe('code');
  });

  it('ignores body flags when useBodyText is false', () => {
    const item = { user: { login: 'someone' }, body: 'DRI:@alice coder', labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, { ...baseOpts, useBodyText: false });
    expect(dri.handle).toBe('@alice');
    expect(dri.role).toBe('review');
  });
});

describe('format helpers', () => {
  it('formats DRI with you substitution', () => {
    const text = formatDri({ handle: '@me', role: 'review' }, '@me');
    expect(text).toBe('DRI (reviewer): you');
  });

  it('formats assignee with action hint when you are coder', () => {
    const item = { assignees: [{ login: 'alice' }], user: { login: 'alice' }, labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, baseOpts);
    const state = { handle: '@alice' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toContain('pls code');
  });
});

describe('resolveCoderHandle', () => {
  it('returns DRI handle when author is MIA', () => {
    const item = { user: { login: 'bob' }, labels: [{ name: 'DRI:@alice' }, { name: 'op_mia' }] };
    const dri = extractDri(item, baseOpts);
    const handle = resolveCoderHandle(item, dri, baseOpts);
    expect(handle).toBe('@alice');
  });

  it('returns not found when author is MIA but DRI is missing', () => {
    const item = { user: { login: 'bob' }, labels: [{ name: 'op_mia' }] };
    const dri = extractDri(item, baseOpts);
    const handle = resolveCoderHandle(item, dri, baseOpts);
    expect(handle).toBe('not found');
  });
});
