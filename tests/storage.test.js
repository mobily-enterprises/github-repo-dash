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
  const useBodyTextInput = document.createElement('input');
  useBodyTextInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useBodyTextInput };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('storage load/save', () => {
  it('saves and loads settings including useBodyText', () => {
    const inputs = createInputs();
    inputs.repoInput.value = 'owner/repo';
    inputs.handleInput.value = '@me';
    inputs.useBodyTextInput.checked = true;

    saveSettings(inputs, {});

    const fresh = createInputs();
    loadSettings(fresh, {});

    expect(fresh.repoInput.value).toBe('owner/repo');
    expect(fresh.handleInput.value).toBe('@me');
    expect(fresh.useBodyTextInput.checked).toBe(true);
  });

  it('respects use_body_text override and disables input', () => {
    const inputs = createInputs();
    const overrides = { hasUseBodyText: true, useBodyText: false };
    loadSettings(inputs, overrides);
    expect(inputs.useBodyTextInput.checked).toBe(false);
    expect(inputs.useBodyTextInput.disabled).toBe(true);
  });
});

describe('getState', () => {
  it('includes useBodyText flag', () => {
    const inputs = createInputs();
    inputs.useBodyTextInput.checked = false;
    const state = getState(inputs);
    expect(state.useBodyText).toBe(false);
    expect(state.driToken).toBe(DEFAULTS.dri);
  });
});
