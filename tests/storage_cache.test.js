import { describe, it, expect } from 'vitest';

import { CARDS_CACHE_TTL_MS, CARDS_CACHE_KEY } from '../docs/config.js';
import { isCacheFresh, loadSettings, getCardCache } from '../docs/storage.js';

function createInputs() {
  const repoInput = document.createElement('input');
  const driInput = document.createElement('input');
  const coderBodyInput = document.createElement('input');
  const coderLabelInput = document.createElement('input');
  const handleInput = document.createElement('input');
  const tokenInput = document.createElement('input');
  const useBodyTextInput = document.createElement('input');
  useBodyTextInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useBodyTextInput };
}

describe('isCacheFresh', () => {
  it('returns true when within TTL', () => {
    const cache = { cachedAt: Date.now() };
    expect(isCacheFresh(cache, CARDS_CACHE_TTL_MS)).toBe(true);
  });

  it('returns true when per-card cachedAt is fresh', () => {
    const cache = { cards: { a: { cachedAt: Date.now() } } };
    expect(isCacheFresh(cache, CARDS_CACHE_TTL_MS)).toBe(true);
  });

  it('returns false when card timestamps are missing', () => {
    const cache = { cards: { a: {} }, cachedAt: null };
    expect(isCacheFresh(cache, CARDS_CACHE_TTL_MS)).toBe(false);
  });

  it('returns false when cache is stale or missing timestamp', () => {
    const stale = { cachedAt: Date.now() - CARDS_CACHE_TTL_MS - 1 };
    expect(isCacheFresh(stale, CARDS_CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh({}, CARDS_CACHE_TTL_MS)).toBe(false);
  });
});

describe('loadSettings respects cachedAt', () => {
  it('restores cachedAt when present in storage', () => {
    const inputs = createInputs();
    localStorage.setItem(
      CARDS_CACHE_KEY,
      JSON.stringify({ fingerprint: 'fp', cards: { a: { cachedAt: 12345 } }, cachedAt: 12345 })
    );
    loadSettings(inputs, {});
    expect(getCardCache().cards.a.cachedAt).toBe(12345);
  });
});
