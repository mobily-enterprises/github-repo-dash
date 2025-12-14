import { describe, it, expect, beforeEach } from 'vitest';
import { saveSettings, loadSettings, getState, persistCardCache } from '../docs/storage.js';
import { STORAGE_KEY, CARDS_CACHE_KEY } from '../docs/config.js';

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

describe('saveSettings handles bad prior storage', () => {
  it('recovers from malformed STORAGE_KEY JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const inputs = createInputs();
    expect(() => saveSettings(inputs, {})).not.toThrow();
  });
});

describe('persistCardCache catches setItem errors', () => {
  it('does not throw when setItem fails', () => {
    const orig = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('fail');
    };
    expect(() => persistCardCache()).not.toThrow();
    localStorage.setItem = orig;
  });
});

describe('getState when useLabelsInput missing', () => {
  it('falls back to defaults', () => {
    const inputs = createInputs();
    delete inputs.useLabelsInput;
    const state = getState(inputs);
    expect(state.useLabels).toBeDefined();
  });
});
