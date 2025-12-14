import { describe, it, expect } from 'vitest';
import { extractDri, formatDri, formatAssignee } from '../docs/dri.js';

describe('extractDri', () => {
  const baseOpts = { driToken: 'DRI:@', coderBodyFlag: 'coder', coderLabelFlag: 'DRI_is_coder' };

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
    const item = { user: { login: 'charlie' }, labels: [{ name: 'DRI:@alice' }, { name: 'DRI_is_coder' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri.role).toBe('code');
  });
});

describe('format helpers', () => {
  it('formats DRI with you substitution', () => {
    const text = formatDri({ handle: '@me', role: 'review' }, '@me');
    expect(text).toBe('DRI (reviewer): you');
  });

  it('formats assignee with action hint when you are coder', () => {
    const item = { assignees: [{ login: 'alice' }], user: { login: 'bob' } };
    const dri = { handle: '@alice', role: 'code' };
    const state = { handle: '@alice' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toContain('pls code');
  });
});
