import { describe, it, expect, beforeEach } from 'vitest';

import { loadSettings, saveSettings, makeFingerprint } from '../docs/storage.js';
import { DEFAULTS, STORAGE_KEY, NOTES_KEY, CARDS_CACHE_KEY } from '../docs/config.js';

function createInputs() {
  const repoInput = document.createElement('input');
  const driInput = document.createElement('input');
  const coderBodyInput = document.createElement('input');
  const coderLabelInput = document.createElement('input');
  const handleInput = document.createElement('input');
  const tokenInput = document.createElement('input');
  const useLabelsInput = document.createElement('input');
  useLabelsInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useLabelsInput };
}

beforeEach(() => {
  localStorage.clear();
});

describe('storage error handling', () => {
  it('handles malformed saved settings', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const inputs = createInputs();
    loadSettings(inputs, {});
    expect(inputs.repoInput.value).toBe('');
  });

  it('handles malformed notes and cache', () => {
    localStorage.setItem(NOTES_KEY, '{bad');
    localStorage.setItem(CARDS_CACHE_KEY, '{bad');
    const inputs = createInputs();
    loadSettings(inputs, {});
    expect(localStorage.getItem(NOTES_KEY)).toBe('{bad');
  });

  it('ignores setItem errors in persist functions', () => {
    const inputs = createInputs();
    const origSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('boom');
    };
    expect(() => saveSettings(inputs, {})).not.toThrow();
    localStorage.setItem = origSetItem;
  });
});

describe('makeFingerprint', () => {
  it('combines state fields', () => {
    const fp = makeFingerprint({
      repo: 'owner/repo',
      driToken: 'DRI:@',
      handle: '@me',
      coderBodyFlag: DEFAULTS.coderBodyFlag,
      coderLabelFlag: DEFAULTS.coderLabelFlag
    });
    expect(fp).toContain('owner/repo');
    expect(fp).toContain('DRI:@');
  });
});
