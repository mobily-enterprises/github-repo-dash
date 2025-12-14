import { describe, it, expect } from 'vitest';

import { extractDri } from '../docs/dri.js';

describe('extractDri body vs label', () => {
  const baseOpts = { driToken: 'DRI:@', coderBodyFlag: 'coder', coderLabelFlag: 'DRI_is_coder' };

  it('finds DRI in body', () => {
    const item = { user: { login: 'bob' }, body: 'Hello DRI:@alice', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('@alice');
  });

  it('returns not found when absent', () => {
    const item = { user: { login: 'bob' }, body: '', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.handle).toBe('not found');
    expect(dri.role).toBe('review');
  });

  it('marks coder via body flag even if not author', () => {
    const item = { user: { login: 'charlie' }, body: 'DRI:@alice coder', labels: [] };
    const dri = extractDri(item, baseOpts);
    expect(dri.role).toBe('code');
  });
});
