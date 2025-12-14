import { describe, it, expect } from 'vitest';

import { CARDS_CACHE_TTL_MS } from '../docs/config.js';
import { isCacheFresh } from '../docs/storage.js';

describe('isCacheFresh', () => {
  it('returns true when within TTL', () => {
    const cache = { cachedAt: Date.now() };
    expect(isCacheFresh(cache, CARDS_CACHE_TTL_MS)).toBe(true);
  });

  it('returns false when cache is stale or missing timestamp', () => {
    const stale = { cachedAt: Date.now() - CARDS_CACHE_TTL_MS - 1 };
    expect(isCacheFresh(stale, CARDS_CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh({}, CARDS_CACHE_TTL_MS)).toBe(false);
  });
});
