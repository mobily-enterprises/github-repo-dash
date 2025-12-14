import { describe, it, expect, vi } from 'vitest';

import { initState, updateState, getState, subscribe, resetState } from '../docs/state.js';

function makeInputs() {
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

describe('state store', () => {
  it('initializes and returns state snapshot', () => {
    resetState();
    const inputs = makeInputs();
    inputs.repoInput.value = 'owner/repo';
    const state = initState(inputs);
    expect(state.repo).toBe('owner/repo');
    expect(getState().repo).toBe('owner/repo');
  });

  it('updates state and notifies subscribers', () => {
    resetState();
    const inputs = makeInputs();
    const spy = vi.fn();
    const unsubscribe = subscribe(spy);
    inputs.repoInput.value = 'a/b';
    updateState(inputs);
    expect(spy).toHaveBeenCalled();
    inputs.repoInput.value = 'c/d';
    const newState = updateState(inputs);
    expect(newState.repo).toBe('c/d');
    unsubscribe();
    inputs.repoInput.value = 'e/f';
    updateState(inputs);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('getState returns null before init', () => {
    resetState();
    expect(getState()).toBeNull();
  });
});
