import {
  config,
  TOP_META_DRI_IDS,
  YOUR_ROLE_IDS,
  TOP_META_ASSIGNEE_IDS,
  DEFAULTS,
  SEARCH_DELAY_MS,
  NO_TOKEN_DELAY_MS,
  CARDS_CACHE_TTL_MS,
  REPO_REGEX
} from './config.js';
import { sleep, createEl, setListPlaceholder, isValidRepo, normalizeHandle } from './utils.js';
import { extractDri, formatDri, extractAssignee, formatAssignee } from './dri.js';
import {
  loadSettings,
  saveSettings,
  makeFingerprint,
  getCardCache,
  setCardCache,
  persistCardCache,
  isCacheFresh,
  getState as getStoredState
} from './storage.js';
import { renderNote, pruneNoteBindings } from './notes.js';
import { rateLimit, fetchSearch, markFetched, fetchLabels } from './network.js';
import { buildQuery, getQueryOverrides } from './core.js';
import { initState, setState, getState as getStoreState } from './state.js';

// DOM references
const repoTitle = document.getElementById('repo-title');
const repoInput = document.getElementById('repo');
const driInput = document.getElementById('dri');
const coderBodyInput = document.getElementById('coder-body-flag');
const coderLabelInput = document.getElementById('coder-label-flag');
const handleInput = document.getElementById('handle');
const tokenInput = document.getElementById('token');
const clearTokenBtn = document.getElementById('clear-token');
const useBodyTextInput = document.getElementById('use-body-text');
const loadButtons = {
  pulls: document.getElementById('load-pulls'),
  triage: document.getElementById('load-triage'),
  issues: document.getElementById('load-issues')
};
const statusEls = {
  pulls: document.getElementById('status-pulls'),
  triage: document.getElementById('status-triage'),
  issues: document.getElementById('status-issues')
};
const grids = {
  issues: document.getElementById('issues-grid'),
  pulls: document.getElementById('prs-grid'),
  triagePriority: document.getElementById('triage-priority-grid'),
  triage: document.getElementById('triage-grid')
};

// State holders
const cards = new Map();
let overrides = {};
let driLabelsRepo = '';
let driLabels = [];
let driLabelsPromise = null;

function normalizeAppState(next) {
  const repo = (next.repo || '').trim() || DEFAULTS.repo;
  const driToken = (next.driToken || '').trim() || DEFAULTS.dri;
  const handle = normalizeHandle(next.handle ?? DEFAULTS.handle, DEFAULTS.handle);
  const handleBare = handle.replace(/^@+/, '');
  const coderBodyFlag = (next.coderBodyFlag || '').trim() || DEFAULTS.coderBodyFlag;
  const coderLabelFlag = (next.coderLabelFlag || '').trim() || DEFAULTS.coderLabelFlag;
  const useBodyText = typeof next.useBodyText === 'boolean' ? next.useBodyText : DEFAULTS.useBodyText;
  return { repo, driToken, handle, handleBare, coderBodyFlag, coderLabelFlag, useBodyText };
}

function filterDriLabelsForState(state) {
  return driLabels.filter((name) => typeof name === 'string' && name.startsWith(state.driToken));
}

async function ensureDriLabels(repo, token) {
  if (!isValidRepo(repo, REPO_REGEX)) {
    driLabelsRepo = '';
    driLabels = [];
    driLabelsPromise = null;
    return [];
  }
  if (repo === driLabelsRepo && driLabelsPromise) return driLabelsPromise;
  if (repo === driLabelsRepo && !driLabelsPromise) return Promise.resolve(driLabels);

  driLabelsRepo = repo;
  const fetchPromise = fetchLabels(repo, token)
    .then((names) => {
      driLabels = names;
      driLabelsPromise = Promise.resolve(names);
      return names;
    })
    .catch((err) => {
      if (repo === driLabelsRepo) {
        driLabels = [];
        driLabelsPromise = null;
        driLabelsRepo = '';
      }
      throw err;
    });
  driLabelsPromise = fetchPromise;
  return fetchPromise;
}

function setStatus(section, text, state = '') {
  const el = statusEls[section];
  if (!el) return;
  el.textContent = text;
  el.dataset.state = state;
}

function buildSearchUrl(state, cfg) {
  const path = cfg.section === 'issues' ? 'issues' : 'pulls';
  const repo = state.repo || DEFAULTS.repo;
  return `https://github.com/${repo}/${path}?q=${encodeURIComponent(
    buildQuery(cfg, state, { driLabels: filterDriLabelsForState(state) })
  )}`;
}

function addTopMetaLines(cardState, item, state, li) {
  const id = cardState.cfg.id;
  const lines = [];
  const dri =
    id === 'prs-mine' || YOUR_ROLE_IDS.has(id) || TOP_META_DRI_IDS.has(id)
      ? extractDri(item, {
          driToken: state?.driToken,
          coderBodyFlag: state?.coderBodyFlag,
          coderLabelFlag: state?.coderLabelFlag
        })
      : null;

  if (id === 'prs-mine') {
    const formatted = formatDri(dri, state?.handle);
    if (formatted) {
      let line = formatted;
      if (dri) {
        const youHandle = (state?.handle || '').toLowerCase();
        const driHandle = (dri.handle || '').toLowerCase();
        const isYou = youHandle && driHandle && youHandle === driHandle;
        let action = '';
        if (dri.role === 'code') action = isYou ? 'pls code' : 'pls review';
        else if (dri.role === 'review') action = isYou ? 'pls review' : 'pls code';
        line = `${formatted} (${action})`;
      }
      lines.push(line);
    }
  } else if (YOUR_ROLE_IDS.has(id)) {
    const roleLabel = dri?.role === 'code' ? 'coder' : 'reviewer';
    lines.push(`Your role: ${roleLabel}`);
  } else if (TOP_META_DRI_IDS.has(id)) {
    const formatted = formatDri(dri, state?.handle);
    if (formatted) lines.push(formatted);
  }
  if (TOP_META_ASSIGNEE_IDS.has(id)) {
    const includeActionForYou = YOUR_ROLE_IDS.has(id);
    lines.push(formatAssignee(item, dri, state, { includeActionForYou }));
  }
  lines.forEach((text) => {
    const line = createEl('div', 'meta', text);
    line.style.fontWeight = '700';
    li.appendChild(line);
  });
}

function markSectionStale(section) {
  setStatus(section, 'Not loaded', '');
  cardsForSection(section).forEach((cardState) => {
    cardState.count.textContent = '–';
    setListPlaceholder(cardState.list, 'Not loaded yet.');
  });
}

function markAllSectionsStale() {
  Object.keys(loadButtons).forEach(markSectionStale);
}

function applyStatePatch(patch, { persist = true, markStale = true } = {}) {
  const base = getStoreState() || {};
  const merged = typeof patch === 'function' ? patch(base) : { ...base, ...patch };
  const normalized = normalizeAppState(merged);
  if (normalized.repo !== driLabelsRepo) {
    driLabelsRepo = '';
    driLabels = [];
    driLabelsPromise = null;
  }
  const nextState = setState(() => normalized);
  if (persist) saveSettings(inputs, overrides, nextState);
  renderQueries();
  renderTitle();
  if (markStale) markAllSectionsStale();
  return nextState;
}

function makeCard(cfg) {
  const card = createEl('article', 'card');
  if (cfg.tone) card.dataset.tone = cfg.tone;

  const header = createEl('div', 'card-header');
  const label = createEl('div', 'label', cfg.label);
  const actions = createEl('div', 'header-actions');
  const count = createEl('div', 'count-pill', '–');
  const reloadBtn = createEl('button', 'mini-btn', 'Reload');
  reloadBtn.type = 'button';
  reloadBtn.title = 'Reload this card only';
  actions.append(count, reloadBtn);
  header.append(label, actions);

  const h3 = createEl('h3', '', cfg.title);
  const desc = createEl('p', '', cfg.desc);

  const list = createEl('ul', 'item-list');
  setListPlaceholder(list, 'Not loaded yet.');

  const footer = createEl('div', 'card-footer');
  const searchLink = createEl('a', 'cta', 'Open search');
  searchLink.target = '_blank';
  searchLink.rel = 'noopener';
  const hint = createEl('div', 'query-hint');
  footer.append(searchLink, hint);

  const loadingBadge = createEl('div', 'loading-badge', 'Loading…');
  loadingBadge.setAttribute('aria-hidden', 'true');

  card.append(header, h3, desc, list, footer, loadingBadge);

  const cardState = { cfg, card, count, list, searchLink, hint, reloadBtn };
  cards.set(cfg.id, cardState);
  const targetGrid = grids[cfg.grid || cfg.section];
  if (targetGrid) targetGrid.appendChild(card);
  reloadBtn.addEventListener('click', async () => {
    const state = getStoreState();
    const token = tokenInput.value.trim();
    setStatus(cfg.section, `Refreshing "${cfg.label}"…`);
    try {
      await ensureDriLabels(state.repo, token);
      renderQueries();
      await refreshCard(cardState, state, token);
      setStatus(cfg.section, 'Updated.', 'ok');
    } catch (err) {
      setStatus(cfg.section, err.message, 'error');
    }
  });
}

function renderQueries() {
  const state = getStoreState();
  const token = tokenInput.value.trim();
  if (!state.useBodyText && isValidRepo(state.repo, REPO_REGEX)) {
    const needsLabels = state.repo !== driLabelsRepo || !driLabelsPromise;
    if (needsLabels) {
      const repoAtRequest = state.repo;
      ensureDriLabels(state.repo, token)
        .then(() => {
          const latest = getStoreState();
          if (latest?.repo === repoAtRequest && !latest.useBodyText) renderQueries();
        })
        .catch(() => {
          /* hint stays as-is on label fetch failure */
        });
    }
  }
  cards.forEach(({ cfg, searchLink, hint }) => {
    const validRepo = isValidRepo(state.repo, REPO_REGEX);
    if (!validRepo) {
      searchLink.href = '#';
      hint.textContent = 'Enter owner/repo to build query';
    } else {
      const query = buildQuery(cfg, state, { driLabels: filterDriLabelsForState(state) });
      searchLink.href = buildSearchUrl(state, cfg);
      // Prevent breaks between the leading minus and its token (e.g., "-label:foo").
      const renderedQuery = query.replace(/ -(\S+)/g, ' \u2011$1');
      hint.textContent = renderedQuery;
    }
  });
}

function renderTitle() {
  if (!repoTitle) return;
  const title = (getStoreState()?.repo || '').trim();
  repoTitle.textContent = title || 'Repository triage snapshot';
}

function hydrateCardsFromCache(state) {
  const cache = getCardCache();
  if (!cache?.fingerprint || cache.fingerprint !== makeFingerprint(state)) return;
  const sectionHasFresh = new Set();
  const sectionStale = new Set();
  Object.entries(cache.cards || {}).forEach(([id, payload]) => {
    const cardState = cards.get(id);
    if (!cardState) return;
    if (!isCacheFresh({ cards: { single: payload } }, CARDS_CACHE_TTL_MS)) {
      markSectionStale(cardState.cfg.section);
      sectionStale.add(cardState.cfg.section);
      return;
    }
    const items = payload?.items || [];
    const count = payload?.total_count;
    cardState.count.textContent = count?.toLocaleString?.() || count || '0';
    renderItems(cardState, items, state);
    sectionHasFresh.add(cardState.cfg.section);
  });
  sectionHasFresh.forEach((section) => setStatus(section, 'Loaded from cache (fresh)', 'ok'));
  sectionStale.forEach((section) => setStatus(section, 'Cache expired; please reload.', 'warn'));
}

function renderItems(cardState, items, state) {
  const list = cardState.list;
  if (!items || items.length === 0) {
    setListPlaceholder(list, 'No items found.');
    pruneNoteBindings();
    return;
  }
  list.innerHTML = '';
  pruneNoteBindings();
  items.forEach((item) => {
    const li = createEl('li');
    addTopMetaLines(cardState, item, state, li);

    const a = createEl('a', null, `#${item.number} ${item.title}`);
    a.href = item.html_url;
    a.target = '_blank';
    a.rel = 'noopener';
    const meta = createEl('div', 'meta');
    const updated = item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '';
    const parts = [`${item.user?.login || 'unknown'} · updated ${updated}`];
    if (cardState.cfg.id === 'issues-assigned') {
      parts.unshift(`Assignee: ${extractAssignee(item)}`);
    }
    if (cardState.cfg.id === 'issues-unlabeled') {
      const assignee = extractAssignee(item);
      if (assignee !== 'unassigned') parts.unshift(`Assignee: ${assignee}`);
      const driBody = item.body
        ? formatDri(
            extractDri(item, {
              driToken: state?.driToken,
              coderBodyFlag: state?.coderBodyFlag,
              coderLabelFlag: state?.coderLabelFlag
            }),
            state?.handle
          )
        : null;
      if (driBody) parts.unshift(driBody);
    }
    meta.textContent = parts.join(' · ');
    li.append(a, meta);
    renderNote(li, state, item);
    list.appendChild(li);
  });
}

async function refreshCard(cardState, state, token) {
  if (!isValidRepo(state.repo, REPO_REGEX)) {
    cardState.count.textContent = '–';
    setListPlaceholder(cardState.list, 'Enter a repository (owner/repo) to load.', 'empty');
    return;
  }
  const query = buildQuery(cardState.cfg, state, { driLabels: filterDriLabelsForState(state) });
  cardState.count.textContent = '…';
  setListPlaceholder(cardState.list, 'Loading…');
  cardState.card.classList.add('is-loading');
  cardState.card.setAttribute('aria-busy', 'true');
  try {
    await rateLimit(token);
    markFetched();
    const data = await fetchSearch(query, token);
    cardState.count.textContent = data.total_count?.toLocaleString?.() || data.total_count || '0';
    renderItems(cardState, data.items || [], state);
    const cache = getCardCache() || { fingerprint: '', cards: {} };
    const nextCache = {
      fingerprint: makeFingerprint(state),
      cards: {
        ...(cache.cards || {}),
        [cardState.cfg.id]: {
          items: data.items || [],
          total_count: data.total_count,
          cachedAt: Date.now()
        }
      }
    };
    setCardCache(nextCache);
    persistCardCache();
  } catch (err) {
    cardState.count.textContent = '!';
    setListPlaceholder(cardState.list, err.message, 'error-text');
    throw err;
  } finally {
    cardState.card.classList.remove('is-loading');
    cardState.card.removeAttribute('aria-busy');
  }
}

function cardsForSection(section) {
  return Array.from(cards.values()).filter((c) => c.cfg.section === section);
}

async function refreshSection(section) {
  const sectionCards = cardsForSection(section);
  if (sectionCards.length === 0) return;
  const token = tokenInput.value.trim();
  const state = getStoreState();
  if (!isValidRepo(state.repo, REPO_REGEX)) {
    setStatus(section, 'Enter a repository (owner/repo) to load.', 'error');
    sectionCards.forEach((cardState) => {
      cardState.count.textContent = '–';
      setListPlaceholder(cardState.list, 'Enter a repository (owner/repo) to load.', 'empty');
    });
    return;
  }
  try {
    await ensureDriLabels(state.repo, token);
    renderQueries();
  } catch (err) {
    setStatus(section, err.message || 'Failed to load labels', 'error');
    return;
  }
  const delay = token ? SEARCH_DELAY_MS : NO_TOKEN_DELAY_MS;
  setStatus(section, `Refreshing ${sectionCards.length} searches…`);
  let errors = 0;
  for (let i = 0; i < sectionCards.length; i += 1) {
    const cardState = sectionCards[i];
    try {
      await refreshCard(cardState, state, token);
    } catch {
      errors += 1;
    }
    if (i < sectionCards.length - 1) await sleep(delay);
  }
  if (errors > 0) setStatus(section, `Completed with ${errors} error(s).`, 'error');
  else setStatus(section, 'Updated.', 'ok');
}

const inputs = {
  repoInput,
  driInput,
  coderBodyInput,
  coderLabelInput,
  handleInput,
  tokenInput,
  useBodyTextInput
};

function init() {
  overrides = getQueryOverrides();
  loadSettings(inputs, overrides);
  config.forEach(makeCard);
  const initialState = normalizeAppState(getStoredState(inputs));
  initState(initialState);
  saveSettings(inputs, overrides, initialState);
  renderQueries();
  renderTitle();
  markAllSectionsStale();
  hydrateCardsFromCache(initialState);

  const handleTokenChange = () => {
    saveSettings(inputs, overrides, getStoreState());
    renderQueries();
    renderTitle();
    markAllSectionsStale();
  };

  if (clearTokenBtn) {
    clearTokenBtn.addEventListener('click', () => {
      tokenInput.value = '';
      handleTokenChange();
    });
  }

  if (tokenInput) tokenInput.addEventListener('input', handleTokenChange);

  if (repoInput) {
    repoInput.addEventListener('input', () =>
      applyStatePatch({ repo: repoInput.value.trim() || DEFAULTS.repo })
    );
  }
  if (driInput) {
    driInput.addEventListener('input', () =>
      applyStatePatch({ driToken: driInput.value.trim() || DEFAULTS.dri })
    );
  }
  if (coderBodyInput) {
    coderBodyInput.addEventListener('input', () =>
      applyStatePatch({ coderBodyFlag: coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag })
    );
  }
  if (coderLabelInput) {
    coderLabelInput.addEventListener('input', () =>
      applyStatePatch({ coderLabelFlag: coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag })
    );
  }
  if (handleInput) {
    handleInput.addEventListener('input', () =>
      applyStatePatch({ handle: handleInput.value || DEFAULTS.handle })
    );
  }
  if (useBodyTextInput) {
    useBodyTextInput.addEventListener('change', () =>
      applyStatePatch({ useBodyText: !!useBodyTextInput.checked })
    );
  }

  Object.entries(loadButtons).forEach(([section, btn]) => {
    if (btn) btn.addEventListener('click', () => refreshSection(section));
  });
}

init();
