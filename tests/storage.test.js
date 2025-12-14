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
  const useBodyInput = document.createElement('input');
  useBodyInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useBodyInput };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('storage load/save', () => {
  it('saves and loads settings including useBody', () => {
    const inputs = createInputs();
    inputs.repoInput.value = 'owner/repo';
    inputs.handleInput.value = '@me';
    inputs.useBodyInput.checked = true;

    saveSettings(inputs, {});

    const fresh = createInputs();
    loadSettings(fresh, {});

    expect(fresh.repoInput.value).toBe('owner/repo');
    expect(fresh.handleInput.value).toBe('@me');
    expect(fresh.useBodyInput.checked).toBe(true);
  });

  it('respects use_body override and disables input', () => {
    const inputs = createInputs();
    const overrides = { hasUseBody: true, useBody: false };
    loadSettings(inputs, overrides);
    expect(inputs.useBodyInput.checked).toBe(false);
    expect(inputs.useBodyInput.disabled).toBe(true);
  });
});

describe('getState', () => {
  it('includes useBody flag', () => {
    const inputs = createInputs();
    inputs.useBodyInput.checked = false;
    const state = getState(inputs);
    expect(state.useBody).toBe(false);
    expect(state.driToken).toBe(DEFAULTS.dri);
  });
});
