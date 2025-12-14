import { describe, it, expect, beforeEach } from 'vitest';

import { getState, setCardCache, getCardCache, setNotesStore, getNotesStore } from '../docs/storage.js';
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
});

describe('getState defaults when toggle missing', () => {
  it('uses DEFAULTS.useLabels when no input provided', () => {
    const inputs = createInputs();
    delete inputs.useLabelsInput;
    const state = getState(inputs);
    expect(state.useLabels).toBe(DEFAULTS.useLabels);
  });
});

describe('card and notes store setters', () => {
  it('sets and gets card cache', () => {
    setCardCache({ foo: 'bar' });
    expect(getCardCache()).toEqual({ foo: 'bar' });
  });

  it('sets and gets notes store', () => {
    setNotesStore({ a: 1 });
    expect(getNotesStore()).toEqual({ a: 1 });
  });
});
