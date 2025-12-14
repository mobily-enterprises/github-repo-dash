import {
  config,
  TOP_META_DRI_IDS,
  YOUR_ROLE_IDS,
  TOP_META_ASSIGNEE_IDS,
  DEFAULTS,
  SEARCH_DELAY_MS,
  REPO_REGEX
} from './config.js';
import { sleep, createEl, setListPlaceholder, normalizeHandle, isValidRepo } from './utils.js';
import { extractDri, formatDri, extractAssignee, formatAssignee } from './dri.js';
import {
  loadSettings,
  saveSettings,
  getState,
  makeFingerprint,
  getCardCache,
  setCardCache,
  persistCardCache
} from './storage.js';
import { renderNote, pruneNoteBindings } from './notes.js';
import { rateLimit, fetchSearch, markFetched } from './network.js';

// DOM references
const repoTitle = document.getElementById('repo-title');
const repoInput = document.getElementById('repo');
const driInput = document.getElementById('dri');
const coderBodyInput = document.getElementById('coder-body-flag');
const coderLabelInput = document.getElementById('coder-label-flag');
const handleInput = document.getElementById('handle');
const tokenInput = document.getElementById('token');
const clearTokenBtn = document.getElementById('clear-token');
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

function getQueryOverrides() {
  const params = new URLSearchParams(window.location.search);
  const rawRepo = params.get('repo');
  const rawDri = params.get('dri_token');
  const rawHandle = params.get('handle');
  const rawCoderBody = params.get('coder_body_flag');
  const rawCoderLabel = params.get('coder_label_flag');

  const repo = rawRepo && rawRepo.trim() ? rawRepo.trim() : '';
  const dri = rawDri && rawDri.trim() ? rawDri.trim() : '';
  const handle = rawHandle && rawHandle.trim() ? normalizeHandle(rawHandle, DEFAULTS.handle) : '';
  const coderBodyFlag = rawCoderBody && rawCoderBody.trim() ? rawCoderBody.trim() : '';
  const coderLabelFlag = rawCoderLabel && rawCoderLabel.trim() ? rawCoderLabel.trim() : '';

  return {
    repo,
    dri,
    handle,
    coderBodyFlag,
    coderLabelFlag,
    hasRepo: !!repo,
    hasDri: !!dri,
    hasHandle: !!handle,
    hasCoderBodyFlag: !!coderBodyFlag,
    hasCoderLabelFlag: !!coderLabelFlag
  };
}

function setStatus(section, text, state = '') {
  const el = statusEls[section];
  if (!el) return;
  el.textContent = text;
  el.dataset.state = state;
}

function buildQuery(cfg, state) {
  const query = cfg.query
    .replace(/__DRI_HANDLE__/g, `${state.driToken}${state.handleBare}`)
    .replace(/__HANDLE__/g, state.handle)
    .replace(/__HANDLE_BARE__/g, state.handleBare)
    .replace(/__DRI__/g, state.driToken)
    .trim();
  const repoClause = state.repo ? ` repo:${state.repo}` : '';
  return query + repoClause;
}

function buildSearchUrl(state, cfg) {
  const path = cfg.section === 'issues' ? 'issues' : 'pulls';
  const repo = state.repo || DEFAULTS.repo;
  return `https://github.com/${repo}/${path}?q=${encodeURIComponent(buildQuery(cfg, state))}`;
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

  card.append(header, h3, desc, list, footer);

  const cardState = { cfg, card, count, list, searchLink, hint, reloadBtn };
  cards.set(cfg.id, cardState);
  const targetGrid = grids[cfg.grid || cfg.section];
  if (targetGrid) targetGrid.appendChild(card);
  reloadBtn.addEventListener('click', async () => {
    const state = getState(inputs);
    const token = tokenInput.value.trim();
    setStatus(cfg.section, `Refreshing "${cfg.label}"…`);
    try {
      await refreshCard(cardState, state, token);
      setStatus(cfg.section, 'Updated.', 'ok');
    } catch (err) {
      setStatus(cfg.section, err.message, 'error');
    }
  });
}

function renderQueries() {
  const state = getState(inputs);
  cards.forEach(({ cfg, searchLink, hint }) => {
    const validRepo = isValidRepo(state.repo, REPO_REGEX);
    if (!validRepo) {
      searchLink.href = '#';
      hint.textContent = 'Enter owner/repo to build query';
    } else {
      const query = buildQuery(cfg, state);
      searchLink.href = buildSearchUrl(state, cfg);
      hint.textContent = query;
    }
  });
}

function renderTitle() {
  if (!repoTitle) return;
  const title = repoInput.value.trim();
  repoTitle.textContent = title || 'Repository triage snapshot';
}

function hydrateCardsFromCache(state) {
  const cache = getCardCache();
  if (!cache?.fingerprint || cache.fingerprint !== makeFingerprint(state)) return;
  const sectionHasCache = new Set();
  Object.entries(cache.cards || {}).forEach(([id, payload]) => {
    const cardState = cards.get(id);
    if (!cardState) return;
    const items = payload?.items || [];
    const count = payload?.total_count;
    cardState.count.textContent = count?.toLocaleString?.() || count || '0';
    renderItems(cardState, items, state);
    sectionHasCache.add(cardState.cfg.section);
  });
  sectionHasCache.forEach((section) => setStatus(section, 'Loaded from cache'));
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
  const query = buildQuery(cardState.cfg, state);
  cardState.count.textContent = '…';
  setListPlaceholder(cardState.list, 'Loading…');
  cardState.card.classList.add('is-loading');
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
          total_count: data.total_count
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
  }
}

function cardsForSection(section) {
  return Array.from(cards.values()).filter((c) => c.cfg.section === section);
}

async function refreshSection(section) {
  const sectionCards = cardsForSection(section);
  if (sectionCards.length === 0) return;
  const token = tokenInput.value.trim();
  const state = getState(inputs);
  if (!isValidRepo(state.repo, REPO_REGEX)) {
    setStatus(section, 'Enter a repository (owner/repo) to load.', 'error');
    sectionCards.forEach((cardState) => {
      cardState.count.textContent = '–';
      setListPlaceholder(cardState.list, 'Enter a repository (owner/repo) to load.', 'empty');
    });
    return;
  }
  const delay = token ? SEARCH_DELAY_MS : NO_TOKEN_DELAY_MS;
  setStatus(section, `Refreshing ${sectionCards.length} searches…`);
  let errors = 0;
  for (let i = 0; i < sectionCards.length; i += 1) {
    const cardState = sectionCards[i];
    try {
      await refreshCard(cardState, state, token);
    } catch (err) {
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
  tokenInput
};

function init() {
  const overrides = getQueryOverrides();
  loadSettings(inputs, overrides);
  config.forEach(makeCard);
  renderQueries();
  renderTitle();
  Object.keys(loadButtons).forEach(markSectionStale);
  hydrateCardsFromCache(getState(inputs));

  const persistAndRender = () => {
    saveSettings(inputs, overrides);
    renderQueries();
    renderTitle();
    Object.keys(loadButtons).forEach(markSectionStale);
  };

  if (clearTokenBtn) {
    clearTokenBtn.addEventListener('click', () => {
      tokenInput.value = '';
      persistAndRender();
    });
  }

  [repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput].forEach((input) => {
    if (input) input.addEventListener('input', persistAndRender);
  });

  Object.entries(loadButtons).forEach(([section, btn]) => {
    if (btn) btn.addEventListener('click', () => refreshSection(section));
  });
}

init();
