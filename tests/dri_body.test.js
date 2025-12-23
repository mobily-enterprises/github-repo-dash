import { describe, it, expect } from 'vitest';

import { extractDri } from '../docs/dri.js';

describe('extractDri body vs label', () => {
  const baseOpts = { driToken: 'DRI:@', coderBodyFlag: 'coder', coderLabelFlag: 'op_mia', useBodyText: true };

  it('finds DRI in body', () => {
    const item = { user: { login: 'bob' }, body: 'Hello DRI:@alice', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('@alice');
  });

  it('falls back to labels when body search is enabled but missing DRI', () => {
    const item = { user: { login: 'bob' }, body: 'no dri here', labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('@alice');
    expect(dri.role).toBe('review');
  });

  it('returns not found when absent', () => {
    const item = { user: { login: 'bob' }, body: '', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('not found');
    expect(dri.role).toBe('review');
  });

  it('treats missing body as not MIA when DRI is in labels', () => {
    const item = { user: { login: 'bob' }, labels: [{ name: 'DRI:@alice' }] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('@alice');
    expect(dri.role).toBe('review');
  });

  it('ignores empty DRI handle when checking MIA body flag', () => {
    const item = { user: { login: 'bob' }, body: 'DRI:@@ coder', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('@');
    expect(dri.role).toBe('review');
  });

  it('marks coder via body flag even if not author', () => {
    const item = { user: { login: 'charlie' }, body: 'DRI:@alice coder', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.role).toBe('code');
  });
});
