import { describe, it, expect, vi } from 'vitest';

import { initState, updateState, getState, subscribe, resetState, setState } from '../docs/state.js';

describe('state store', () => {
  it('initializes and returns state snapshot', () => {
    resetState();
    const initial = { repo: 'owner/repo', handle: '@alice', driToken: 'dri' };
    const state = initState(initial);
    expect(state.repo).toBe('owner/repo');
    expect(getState().handle).toBe('@alice');
    expect(state.driToken).toBe('dri');
  });

  it('updates state and notifies subscribers', () => {
    resetState();
    const spy = vi.fn();
    const unsubscribe = subscribe(spy);
    initState({ repo: 'a/b', handle: '@me' });
    const newState = setState((prev) => ({ ...prev, repo: 'c/d' }));
    expect(newState.repo).toBe('c/d');
    expect(spy).toHaveBeenCalledWith(newState);
    const merged = updateState({ handle: '@bob' });
    expect(merged.handle).toBe('@bob');
    expect(spy).toHaveBeenCalledTimes(2);
    unsubscribe();
    setState({ repo: 'e/f' });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('supports setting state before init and merges from empty', () => {
    resetState();
    const next = setState({ repo: 'cold/start' });
    expect(next.repo).toBe('cold/start');
    expect(getState().repo).toBe('cold/start');
  });

  it('applies functional updater on cold start', () => {
    resetState();
    const next = setState((prev) => ({ ...prev, repo: 'from-fn' }));
    expect(next.repo).toBe('from-fn');
    expect(getState().repo).toBe('from-fn');
  });

  it('getState returns null before init', () => {
    resetState();
    expect(getState()).toBeNull();
  });
});
