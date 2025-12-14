let currentState = null;
const listeners = new Set();

export function initState(initialState) {
  currentState = { ...initialState };
  return currentState;
}

export function setState(patch) {
  const next =
    typeof patch === 'function'
      ? patch(currentState || {})
      : { ...(currentState || {}), ...patch };
  currentState = next;
  listeners.forEach((fn) => fn(currentState));
  return currentState;
}

export const updateState = setState;

export function getState() {
  return currentState;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetState() {
  currentState = null;
  listeners.clear();
}
