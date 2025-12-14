import { DEFAULTS, STORAGE_KEY, NOTES_KEY, CARDS_CACHE_KEY } from './config.js';
import { normalizeHandle } from './utils.js';

let notesStore = {};
let cardCache = { fingerprint: '', cards: {} };

export function loadSettings(inputs, overrides) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput } = inputs;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.repo) repoInput.value = saved.repo;
    if (saved.dri) driInput.value = saved.dri;
    if (saved.coderBodyFlag) coderBodyInput.value = saved.coderBodyFlag;
    if (saved.coderLabelFlag) coderLabelInput.value = saved.coderLabelFlag;
    if (saved.handle) handleInput.value = normalizeHandle(saved.handle, DEFAULTS.handle);
    if (saved.token) tokenInput.value = saved.token;
  } catch (_) {
    // ignore malformed storage
  }

  if (overrides.repo) repoInput.value = overrides.repo;
  if (overrides.dri) driInput.value = overrides.dri;
  if (overrides.coderBodyFlag) coderBodyInput.value = overrides.coderBodyFlag;
  if (overrides.coderLabelFlag) coderLabelInput.value = overrides.coderLabelFlag;
  if (overrides.handle) handleInput.value = normalizeHandle(overrides.handle, DEFAULTS.handle);

  if (!repoInput.value) repoInput.value = DEFAULTS.repo;
  if (!driInput.value) driInput.value = DEFAULTS.dri;
  if (!coderBodyInput.value) coderBodyInput.value = DEFAULTS.coderBodyFlag;
  if (!coderLabelInput.value) coderLabelInput.value = DEFAULTS.coderLabelFlag;
  if (!handleInput.value) handleInput.value = DEFAULTS.handle;
  if (!tokenInput.value) tokenInput.value = DEFAULTS.token;

  repoInput.disabled = !!overrides.hasRepo;
  driInput.disabled = !!overrides.hasDri;
  coderBodyInput.disabled = !!overrides.hasCoderBodyFlag;
  coderLabelInput.disabled = !!overrides.hasCoderLabelFlag;
  handleInput.disabled = !!overrides.hasHandle;

  try {
    notesStore = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
  } catch (_) {
    notesStore = {};
  }
  try {
    const cache = JSON.parse(localStorage.getItem(CARDS_CACHE_KEY) || '{}');
    if (cache && typeof cache === 'object') {
      cardCache = cache;
    }
  } catch (_) {
    cardCache = { fingerprint: '', cards: {} };
  }
}

export function saveSettings(inputs, overrides) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput } = inputs;
  let prev = {};
  try {
    prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (_) {
    prev = {};
  }
  const data = { ...prev };
  if (!overrides.hasRepo) data.repo = repoInput.value.trim() || DEFAULTS.repo;
  if (!overrides.hasDri) data.dri = driInput.value.trim() || DEFAULTS.dri;
  if (!overrides.hasCoderBodyFlag) data.coderBodyFlag = coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag;
  if (!overrides.hasCoderLabelFlag) data.coderLabelFlag = coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag;
  if (!overrides.hasHandle) data.handle = normalizeHandle(handleInput.value, DEFAULTS.handle);
  data.token = tokenInput.value.trim();

  repoInput.value = data.repo || DEFAULTS.repo;
  driInput.value = data.dri || DEFAULTS.dri;
  coderBodyInput.value = data.coderBodyFlag || DEFAULTS.coderBodyFlag;
  coderLabelInput.value = data.coderLabelFlag || DEFAULTS.coderLabelFlag;
  handleInput.value = data.handle || DEFAULTS.handle;
  tokenInput.value = data.token;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  persistNotes();
}

export function persistNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notesStore));
  } catch (_) {
    // ignore storage errors
  }
}

export function persistCardCache() {
  try {
    localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cardCache));
  } catch (_) {
    // ignore storage errors
  }
}

export function getNotesStore() {
  return notesStore;
}

export function setNotesStore(store) {
  notesStore = store;
}

export function getCardCache() {
  return cardCache;
}

export function setCardCache(cache) {
  cardCache = cache;
}

export function getState(inputs) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput } = inputs;
  const repo = repoInput.value.trim() || DEFAULTS.repo;
  const driToken = driInput.value.trim() || DEFAULTS.dri;
  const handle = normalizeHandle(handleInput.value, DEFAULTS.handle);
  const handleBare = handle.replace(/^@+/, '');
  const coderBodyFlag = coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag;
  const coderLabelFlag = coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag;
  return { repo, driToken, handle, handleBare, coderBodyFlag, coderLabelFlag };
}

export function makeFingerprint(state) {
  return `${STORAGE_KEY}::${state.repo}::${state.driToken}::${state.handle}::${state.coderBodyFlag}::${state.coderLabelFlag}`;
}
