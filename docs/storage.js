import { DEFAULTS, STORAGE_KEY, NOTES_KEY, CARDS_CACHE_KEY, CARDS_CACHE_TTL_MS } from './config.js';
import { normalizeHandle } from './utils.js';

let notesStore = {};
let cardCache = { fingerprint: '', cards: {}, cachedAt: 0 };

export function loadSettings(inputs, overrides) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useLabelsInput } = inputs;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.repo) repoInput.value = saved.repo;
    if (saved.dri) driInput.value = saved.dri;
    if (saved.coderBodyFlag) coderBodyInput.value = saved.coderBodyFlag;
    if (saved.coderLabelFlag) coderLabelInput.value = saved.coderLabelFlag;
    if (saved.handle) handleInput.value = normalizeHandle(saved.handle, DEFAULTS.handle);
    if (saved.token) tokenInput.value = saved.token;
    if (!overrides.hasUseLabels && typeof saved.useLabels === 'boolean' && useLabelsInput) {
      useLabelsInput.checked = saved.useLabels;
    }
  } catch {
    // ignore malformed storage
  }

  if (overrides.repo) repoInput.value = overrides.repo;
  if (overrides.dri) driInput.value = overrides.dri;
  if (overrides.coderBodyFlag) coderBodyInput.value = overrides.coderBodyFlag;
  if (overrides.coderLabelFlag) coderLabelInput.value = overrides.coderLabelFlag;
  if (overrides.handle) handleInput.value = normalizeHandle(overrides.handle, DEFAULTS.handle);
  if (overrides.hasUseLabels && useLabelsInput) useLabelsInput.checked = !!overrides.useLabels;

  if (!repoInput.value) repoInput.value = DEFAULTS.repo;
  if (!driInput.value) driInput.value = DEFAULTS.dri;
  if (!coderBodyInput.value) coderBodyInput.value = DEFAULTS.coderBodyFlag;
  if (!coderLabelInput.value) coderLabelInput.value = DEFAULTS.coderLabelFlag;
  if (!handleInput.value) handleInput.value = DEFAULTS.handle;
  if (!tokenInput.value) tokenInput.value = DEFAULTS.token;
  if (useLabelsInput && !overrides.hasUseLabels) {
    useLabelsInput.checked =
      typeof useLabelsInput.checked === 'boolean' ? useLabelsInput.checked : DEFAULTS.useLabels;
  }

  repoInput.disabled = !!overrides.hasRepo;
  driInput.disabled = !!overrides.hasDri;
  coderBodyInput.disabled = !!overrides.hasCoderBodyFlag;
  coderLabelInput.disabled = !!overrides.hasCoderLabelFlag;
  handleInput.disabled = !!overrides.hasHandle;
  if (useLabelsInput) useLabelsInput.disabled = !!overrides.hasUseLabels;

  try {
    notesStore = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
  } catch {
    notesStore = {};
  }
  try {
    const cache = JSON.parse(localStorage.getItem(CARDS_CACHE_KEY) || '{}');
    if (cache && typeof cache === 'object') {
      cardCache = {
        fingerprint: cache.fingerprint || '',
        cards: cache.cards || {},
        cachedAt: typeof cache.cachedAt === 'number' ? cache.cachedAt : 0
      };
    }
  } catch {
    cardCache = { fingerprint: '', cards: {}, cachedAt: 0 };
  }
}

export function saveSettings(inputs, overrides, stateOverride) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useLabelsInput } = inputs;
  let prev = {};
  try {
    prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    prev = {};
  }
  const prevRepo = (prev.repo || '').trim() || DEFAULTS.repo;
  const prevDri = (prev.dri || '').trim() || DEFAULTS.dri;
  const prevCoderBody = (prev.coderBodyFlag || '').trim() || DEFAULTS.coderBodyFlag;
  const prevCoderLabel = (prev.coderLabelFlag || '').trim() || DEFAULTS.coderLabelFlag;
  const prevHandle = normalizeHandle(prev.handle, DEFAULTS.handle);
  const prevUseLabels =
    typeof prev.useLabels === 'boolean' ? prev.useLabels : DEFAULTS.useLabels;
  const repoRaw =
    typeof stateOverride?.repo === 'string' ? stateOverride.repo : repoInput.value;
  const repo = (repoRaw || '').toString().trim() || DEFAULTS.repo;
  const driRaw =
    typeof stateOverride?.driToken === 'string' ? stateOverride.driToken : driInput.value;
  const driToken = (driRaw || '').toString().trim() || DEFAULTS.dri;
  const coderBodyRaw =
    typeof stateOverride?.coderBodyFlag === 'string'
      ? stateOverride.coderBodyFlag
      : coderBodyInput.value;
  const coderBodyFlag = (coderBodyRaw || '').toString().trim() || DEFAULTS.coderBodyFlag;
  const coderLabelRaw =
    typeof stateOverride?.coderLabelFlag === 'string'
      ? stateOverride.coderLabelFlag
      : coderLabelInput.value;
  const coderLabelFlag = (coderLabelRaw || '').toString().trim() || DEFAULTS.coderLabelFlag;
  const handle = normalizeHandle(
    typeof stateOverride?.handle === 'string' ? stateOverride.handle : handleInput.value,
    DEFAULTS.handle
  );
  let useLabels = DEFAULTS.useLabels;
  if (overrides.hasUseLabels) useLabels = prevUseLabels;
  else if (typeof stateOverride?.useLabels === 'boolean') useLabels = stateOverride.useLabels;
  else if (useLabelsInput) useLabels = !!useLabelsInput.checked;
  const token = tokenInput.value.trim();
  const data = { ...prev };
  if (!overrides.hasRepo) data.repo = repo;
  if (!overrides.hasDri) data.dri = driToken;
  if (!overrides.hasCoderBodyFlag) data.coderBodyFlag = coderBodyFlag;
  if (!overrides.hasCoderLabelFlag) data.coderLabelFlag = coderLabelFlag;
  if (!overrides.hasHandle) data.handle = handle;
  data.token = token;
  if (useLabelsInput) {
    data.useLabels = useLabels;
  } else if (typeof stateOverride?.useLabels === 'boolean') {
    data.useLabels = stateOverride.useLabels;
  } else if (overrides.hasUseLabels) {
    data.useLabels = prevUseLabels;
  } else {
    data.useLabels = DEFAULTS.useLabels;
  }

  const repoForInput = overrides.hasRepo ? stateOverride?.repo ?? prevRepo : repo;
  const driForInput = overrides.hasDri ? stateOverride?.driToken ?? prevDri : driToken;
  const coderBodyForInput = overrides.hasCoderBodyFlag
    ? stateOverride?.coderBodyFlag ?? prevCoderBody
    : coderBodyFlag;
  const coderLabelForInput = overrides.hasCoderLabelFlag
    ? stateOverride?.coderLabelFlag ?? prevCoderLabel
    : coderLabelFlag;
  const handleForInput = overrides.hasHandle
    ? normalizeHandle(stateOverride?.handle ?? prevHandle, DEFAULTS.handle)
    : handle;
  const useLabelsForInput = overrides.hasUseLabels
    ? prevUseLabels
    : typeof stateOverride?.useLabels === 'boolean'
      ? stateOverride.useLabels
      : useLabelsInput
        ? !!useLabelsInput.checked
        : useLabels;

  repoInput.value = repoForInput;
  driInput.value = driForInput;
  coderBodyInput.value = coderBodyForInput;
  coderLabelInput.value = coderLabelForInput;
  handleInput.value = handleForInput;
  tokenInput.value = token;
  if (useLabelsInput) useLabelsInput.checked = !!useLabelsForInput;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  persistNotes();
}

export function persistNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notesStore));
  } catch {
    // ignore storage errors
  }
}

export function persistCardCache() {
  try {
    localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cardCache));
  } catch {
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

export function isCacheFresh(cache, ttl = CARDS_CACHE_TTL_MS) {
  if (!cache || (!cache.cachedAt && !cache.cards)) return false;
  const cardTimestamps = Object.values(cache.cards || {}).map((entry) => entry?.cachedAt).filter(Boolean);
  const latest = cardTimestamps.length > 0 ? Math.max(...cardTimestamps) : cache.cachedAt;
  if (!latest) return false;
  const age = Date.now() - latest;
  return age <= ttl;
}

export function getState(inputs) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, useLabelsInput } = inputs;
  const repo = repoInput.value.trim() || DEFAULTS.repo;
  const driToken = driInput.value.trim() || DEFAULTS.dri;
  const handle = handleInput.value || DEFAULTS.handle;
  const normalizedHandle = normalizeHandle(handle, DEFAULTS.handle);
  const handleBare = normalizedHandle.replace(/^@+/, '');
  const coderBodyFlag = coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag;
  const coderLabelFlag = coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag;
  const useLabels = useLabelsInput ? !!useLabelsInput.checked : DEFAULTS.useLabels;
  return { repo, driToken, handle: normalizedHandle, handleBare, coderBodyFlag, coderLabelFlag, useLabels };
}

export function makeFingerprint(state) {
  return `${STORAGE_KEY}::${state.repo}::${state.driToken}::${state.handle}::${state.coderBodyFlag}::${state.coderLabelFlag}`;
}
