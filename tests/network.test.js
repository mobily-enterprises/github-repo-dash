import { describe, it, expect, vi, afterEach } from 'vitest';

import { fetchSearch } from '../docs/network.js';

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
});

describe('fetchSearch', () => {
  it('throws a wrapped error on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'forbidden' })
    });
    await expect(fetchSearch('q')).rejects.toThrow('GitHub search failed: 403 forbidden');
  });

  it('standardizes abort errors', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortError);
    await expect(fetchSearch('q', '', { signal: new AbortController().signal })).rejects.toThrow(
      'Request aborted'
    );
  });
});
