import { getState as readState } from './storage.js';

let currentState = null;
const listeners = new Set();

export function initState(inputs) {
  currentState = readState(inputs);
  return currentState;
}

export function updateState(inputs) {
  currentState = readState(inputs);
  listeners.forEach((fn) => fn(currentState));
  return currentState;
}

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
