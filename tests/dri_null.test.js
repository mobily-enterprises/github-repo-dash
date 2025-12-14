import { describe, it, expect } from 'vitest';

import { formatDri, extractAssignee, formatAssignee } from '../docs/dri.js';

describe('dri null/assignee branches', () => {
  it('formatDri returns null when not found', () => {
    const text = formatDri({ handle: 'not found', role: 'review' }, '@me');
    expect(text).toBeNull();
  });

  it('extractAssignee returns unassigned when none', () => {
    expect(extractAssignee({})).toBe('unassigned');
  });

  it('formatAssignee handles unassigned', () => {
    const text = formatAssignee({ assignees: [] }, { handle: '@a', role: 'review' }, { handle: '@a' });
    expect(text).toBe('Assignee: unassigned');
  });
});
