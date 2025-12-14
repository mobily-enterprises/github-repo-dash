import { describe, it, expect, beforeEach } from 'vitest';

import { loadSettings, saveSettings, getState } from '../docs/storage.js';
import { DEFAULTS } from '../docs/config.js';

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
  window.history.replaceState({}, '', '/');
});

describe('storage load/save', () => {
  it('saves and loads settings including useLabels', () => {
    const inputs = createInputs();
    inputs.repoInput.value = 'owner/repo';
    inputs.handleInput.value = '@me';
    inputs.useLabelsInput.checked = true;

    saveSettings(inputs, {});

    const fresh = createInputs();
    loadSettings(fresh, {});

    expect(fresh.repoInput.value).toBe('owner/repo');
    expect(fresh.handleInput.value).toBe('@me');
    expect(fresh.useLabelsInput.checked).toBe(true);
  });

  it('respects use_labels override and disables input', () => {
    const inputs = createInputs();
    const overrides = { hasUseLabels: true, useLabels: false };
    loadSettings(inputs, overrides);
    expect(inputs.useLabelsInput.checked).toBe(false);
    expect(inputs.useLabelsInput.disabled).toBe(true);
  });
});

describe('getState', () => {
  it('includes useLabels flag', () => {
    const inputs = createInputs();
    inputs.useLabelsInput.checked = false;
    const state = getState(inputs);
    expect(state.useLabels).toBe(false);
    expect(state.driToken).toBe(DEFAULTS.dri);
  });
});
