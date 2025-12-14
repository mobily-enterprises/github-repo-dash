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
  const useBodyTextInput = document.createElement('input');
  useBodyTextInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useBodyTextInput };
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

describe('saveSettings with explicit state', () => {
  it('persists provided state and syncs inputs', () => {
    const inputs = createInputs();
    const state = {
      repo: 'owner/repo',
      driToken: 'DRI:@override',
      coderBodyFlag: 'coderFlag',
      coderLabelFlag: 'labelFlag',
      handle: 'alice',
      useBodyText: true
    };
    saveSettings(inputs, {}, state);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.repo).toBe('owner/repo');
    expect(saved.dri).toBe('DRI:@override');
    expect(saved.handle).toBe('@alice');
    expect(inputs.handleInput.value).toBe('@alice');
    expect(inputs.useBodyTextInput.checked).toBe(true);
  });

  it('keeps locked fields persisted but reflects override state in inputs', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        repo: 'locked/repo',
        dri: 'DRI:@locked',
        handle: '@locked',
        coderBodyFlag: 'lockedBody',
        coderLabelFlag: 'lockedLabel',
        useBodyText: false
      })
    );
    const inputs = createInputs();
    inputs.useBodyTextInput.checked = false;
    const overrides = {
      hasRepo: true,
      hasDri: true,
      hasCoderBodyFlag: true,
      hasCoderLabelFlag: true,
      hasHandle: true,
      hasUseBodyText: true
    };
    const state = {
      repo: 'override/repo',
      driToken: 'DRI:@override',
      handle: '@override',
      coderBodyFlag: 'bodyOverride',
      coderLabelFlag: 'labelOverride',
      useBodyText: true
    };
    saveSettings(inputs, overrides, state);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.repo).toBe('locked/repo');
    expect(saved.dri).toBe('DRI:@locked');
    expect(saved.coderBodyFlag).toBe('lockedBody');
    expect(saved.coderLabelFlag).toBe('lockedLabel');
    expect(saved.handle).toBe('@locked');
    expect(saved.useBodyText).toBe(false);
    expect(inputs.repoInput.value).toBe('override/repo');
    expect(inputs.driInput.value).toBe('DRI:@override');
    expect(inputs.coderBodyInput.value).toBe('bodyOverride');
    expect(inputs.coderLabelInput.value).toBe('labelOverride');
    expect(inputs.handleInput.value).toBe('@override');
    expect(inputs.useBodyTextInput.checked).toBe(false);
  });

  it('respects stateOverride.useBodyText when toggle input is missing', () => {
    const inputs = createInputs();
    delete inputs.useBodyTextInput;
    saveSettings(inputs, {}, { repo: 'r/x', driToken: 'DRI:@x', handle: '@x', useBodyText: true });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.useBodyText).toBe(true);
  });

  it('defaults useBodyText when toggle input is missing and no override', () => {
    const inputs = createInputs();
    delete inputs.useBodyTextInput;
    saveSettings(inputs, {}, { repo: 'r/x', driToken: 'DRI:@x', handle: '@x' });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.useBodyText).toBe(false);
  });

  it('writes defaults when inputs are blank and no overrides', () => {
    const inputs = createInputs();
    saveSettings(inputs, {});
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved.repo).toBe(DEFAULTS.repo);
    expect(saved.dri).toBe(DEFAULTS.dri);
    expect(saved.coderBodyFlag).toBe(DEFAULTS.coderBodyFlag);
    expect(saved.coderLabelFlag).toBe(DEFAULTS.coderLabelFlag);
    expect(saved.handle).toBe(DEFAULTS.handle);
    expect(saved.useBodyText).toBe(DEFAULTS.useBodyText);
    expect(inputs.repoInput.value).toBe(DEFAULTS.repo);
    expect(inputs.handleInput.value).toBe(DEFAULTS.handle);
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
