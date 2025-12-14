import { describe, it, expect } from 'vitest';
import { formatAssignee } from '../docs/dri.js';

describe('formatAssignee suffix and actions', () => {
  it('adds reviewing suffix when DRI is coder and assignee differs', () => {
    const item = { assignees: [{ login: 'bob' }], user: { login: 'alice' } };
    const dri = { handle: '@alice', role: 'code' };
    const state = { handle: '@alice' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: false });
    expect(text).toContain('(reviewing)');
  });

  it('adds coding suffix when DRI is reviewer and assignee is author', () => {
    const item = { assignees: [{ login: 'bob' }], user: { login: 'bob' } };
    const dri = { handle: '@alice', role: 'review' };
    const state = { handle: '@alice' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: false });
    expect(text).toContain('(coding)');
  });

  it('adds reviewer action when you are assignee and DRI is reviewer', () => {
    const item = { assignees: [{ login: 'me' }], user: { login: 'bob' } };
    const dri = { handle: '@alice', role: 'review' };
    const state = { handle: '@me' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toContain('pls review');
  });
});
