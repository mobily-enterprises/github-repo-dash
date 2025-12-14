import { describe, it, expect, beforeEach } from 'vitest';

import { saveSettings, getState, persistCardCache } from '../docs/storage.js';
import { STORAGE_KEY } from '../docs/config.js';

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
});

describe('saveSettings handles bad prior storage', () => {
  it('recovers from malformed STORAGE_KEY JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const inputs = createInputs();
    expect(() => saveSettings(inputs, {})).not.toThrow();
  });

  it('uses previous toggle when override locks useBodyText', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ useBodyText: false }));
    const inputs = createInputs();
    inputs.useBodyTextInput.checked = true;
    saveSettings(inputs, { hasUseBodyText: true });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.useBodyText).toBe(false);
    expect(inputs.useBodyTextInput.checked).toBe(false);
  });

  it('falls back to prior toggle when input missing and override locks it', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ useBodyText: true }));
    const inputs = createInputs();
    delete inputs.useBodyTextInput;
    saveSettings(inputs, { hasUseBodyText: true });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.useBodyText).toBe(true);
  });

  it('keeps prior saved values when overrides lock everything and no state override', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        repo: 'prev/repo',
        dri: 'DRI:@prev',
        coderBodyFlag: 'prevBody',
        coderLabelFlag: 'prevLabel',
        handle: '@prev',
        useBodyText: true
      })
    );
    const inputs = createInputs();
    inputs.repoInput.value = '';
    inputs.driInput.value = '';
    inputs.coderBodyInput.value = '';
    inputs.coderLabelInput.value = '';
    inputs.handleInput.value = '';
    inputs.useBodyTextInput.checked = false;
    const overrides = {
      hasRepo: true,
      hasDri: true,
      hasCoderBodyFlag: true,
      hasCoderLabelFlag: true,
      hasHandle: true,
      hasUseBodyText: true
    };
    saveSettings(inputs, overrides);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.repo).toBe('prev/repo');
    expect(saved.dri).toBe('DRI:@prev');
    expect(saved.coderBodyFlag).toBe('prevBody');
    expect(saved.coderLabelFlag).toBe('prevLabel');
    expect(saved.handle).toBe('@prev');
    expect(saved.useBodyText).toBe(true);
    expect(inputs.repoInput.value).toBe('prev/repo');
    expect(inputs.useBodyTextInput.checked).toBe(true);
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

describe('getState when useBodyTextInput missing', () => {
  it('falls back to defaults', () => {
    const inputs = createInputs();
    delete inputs.useBodyTextInput;
    const state = getState(inputs);
    expect(state.useBodyText).toBeDefined();
  });
});
