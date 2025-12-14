const config = [
      {
        id: 'issues-unlabeled',
        section: 'issues',
        label: 'Untriaged',
        title: 'Open issues without labels',
        desc: 'Zero labels attached. Likely need triage.',
        query: 'is:issue is:open no:label'
      },
      // {
      //   id: 'issues-no-assignee',
      //   section: 'issues',
      //   label: 'Idle',
      //   title: 'Open issues without assignee',
      //   desc: 'Issues not being actively worked on.',
      //   query: 'is:issue is:open no:assignee'
      // },
      {
        id: 'issues-assigned',
        section: 'issues',
        label: 'In Progress',
        title: 'Open issues with an assignee',
        desc: 'Issues that are currently owned.',
        query: 'is:issue is:open assignee:*'
      },
      {
        id: 'issues-mine',
        section: 'issues',
        label: 'Mine',
        title: 'Open issues assigned to you',
        desc: 'Issues where you are the assignee.',
        query: 'is:issue is:open assignee:__HANDLE_BARE__'
      },
      {
        id: 'prs-mine',
        section: 'pulls',
        label: 'Blocking',
        title: 'PRs assigned to you',
        desc: 'You are blocking these PRs as assignee.',
        query: 'is:pr is:open assignee:__HANDLE_BARE__'
      },
      {
        id: 'prs-dri-waiting',
        section: 'pulls',
        label: 'DRI waiting',
        title: 'PRs: you are DRI, not assignee',
        desc: 'You are DRI, not assigned: waiting on others.',
        query: 'is:pr is:open "__DRI_HANDLE__" -assignee:__HANDLE_BARE__'
      },
      {
        id: 'prs-dri-me',
        section: 'pulls',
        label: 'DRI: You',
        title: 'PRs: you are DRI',
        desc: 'PR body lists you as DRI.',
        query: 'is:pr is:open "__DRI_HANDLE__"'
      },
      {
        id: 'prs-dri-waiting-assignee',
        section: 'triage',
        grid: 'triagePriority',
        label: 'WAITING',
        tone: 'warn',
        title: 'PRs with DRI but no assignee',
        desc: 'DRI declared in body but nobody is assigned. Assign the work.',
        query: 'is:pr is:open "__DRI__" no:assignee'
      },
      {
        id: 'prs-no-dri',
        section: 'triage',
        label: 'Unowned',
        tone: 'warn',
        title: 'Open PRs with no DRI',
        desc: 'PR body does not declare a DRI. Unowned.',
        query: 'is:pr is:open in:body NOT "__DRI__"'
      },
      {
        id: 'prs-with-dri',
        section: 'triage',
        label: 'Owned',
        title: 'Open PRs with a DRI',
        desc: 'PR body includes a DRI tag.',
        query: 'is:pr is:open "__DRI__"'
      },
      {
        id: 'prs-assignee-no-dri',
        section: 'triage',
        label: 'Needs DRI',
        tone: 'error',
        title: 'PRs with assignee but no DRI',
        desc: 'Assigned but missing a DRI. Likely erroneous.',
        query: 'is:pr is:open assignee:* in:body NOT "__DRI__"'
      }
    ];

    // Which cards show extra DRI/assignee metadata in the list items.
    const TOP_META_DRI_IDS = new Set(['prs-with-dri', 'prs-mine', 'prs-dri-waiting-assignee', 'prs-dri-me', 'prs-dri-waiting']);
    const YOUR_ROLE_IDS = new Set(['prs-dri-me', 'prs-dri-waiting']);
    const TOP_META_ASSIGNEE_IDS = new Set([
      'prs-with-dri',
      'prs-no-dri',
      'prs-dri-me',
      'prs-dri-waiting',
      'prs-dri-waiting-assignee',
      'prs-assignee-no-dri'
    ]);

    // Baseline defaults for inputs and flags. Query params can override and disable these.
    const DEFAULTS = {
      repo: '',
      dri: 'DRI:@',
      handle: '@me',
      token: '',
      coderBodyFlag: 'coder',
      coderLabelFlag: 'DRI_is_coder'
    };
    const SEARCH_DELAY_MS = 5000; // throttle between search calls to avoid secondary limits (authenticated)
    const NO_TOKEN_DELAY_MS = 10000; // throttle harder when unauthenticated
    // STORAGE_KEY ignores the query string so query overrides stay ephemeral; hash stays to scope per page.
const STORAGE_KEY = `knexRepoDashSettings:${window.location.origin}${window.location.pathname}${window.location.hash}`;
const NOTES_KEY = `${STORAGE_KEY}:notes`;
const CARDS_CACHE_KEY = `${STORAGE_KEY}:cardsCache`;

// Inputs and static references
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
    const queryOverrides = getQueryOverrides();

    const cards = new Map();
    const noteBindings = new Map();
    let cardCache = { fingerprint: '', cards: {} };
    let lastFetchAt = 0;
    let notesStore = {};

    // Small helpers for DOM creation and timing.
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const createEl = (tag, className, textContent) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (typeof textContent === 'string') el.textContent = textContent;
      return el;
    };

    const setListPlaceholder = (list, text, cls = 'empty') => {
      list.innerHTML = '';
      const li = createEl('li', cls, text);
      list.appendChild(li);
    };

    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ensureAt = (handle) => {
      if (!handle) return 'not found';
      return handle.startsWith('@') ? handle : `@${handle}`;
    };

    // Throttle GitHub API calls to avoid secondary limits; slower when unauthenticated.
    async function rateLimit(token) {
      if (token) return;
      const now = Date.now();
      const wait = Math.max(0, NO_TOKEN_DELAY_MS - (now - lastFetchAt));
      if (wait > 0) {
        await sleep(wait);
      }
    }

    // Normalizes handle input to always start with @.
    function normalizeHandle(raw) {
      const trimmed = (raw || '').trim();
      if (!trimmed) return DEFAULTS.handle;
      return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    }

    // Read query params that may override inputs (and lock them).
    function getQueryOverrides() {
      const params = new URLSearchParams(window.location.search);
      const hasRepo = params.has('repo');
      const hasDri = params.has('dri_token');
      const hasHandle = params.has('handle');
      const hasCoderBodyFlag = params.has('coder_body_flag');
      const hasCoderLabelFlag = params.has('coder_label_flag');
      const repoParam = hasRepo ? params.get('repo') : null;
      const driParam = hasDri ? params.get('dri_token') : null;
      const handleParam = hasHandle ? params.get('handle') : null;
      const coderBodyParam = hasCoderBodyFlag ? params.get('coder_body_flag') : null;
      const coderLabelParam = hasCoderLabelFlag ? params.get('coder_label_flag') : null;
      const repo = repoParam && repoParam.trim() ? repoParam.trim() : '';
      const dri = driParam && driParam.trim() ? driParam.trim() : '';
      const handle = handleParam && handleParam.trim() ? normalizeHandle(handleParam) : '';
      const coderBodyFlag = coderBodyParam && coderBodyParam.trim() ? coderBodyParam.trim() : '';
      const coderLabelFlag = coderLabelParam && coderLabelParam.trim() ? coderLabelParam.trim() : '';
      return {
        repo,
        dri,
        handle,
        coderBodyFlag,
        coderLabelFlag,
        hasRepo,
        hasDri,
        hasHandle,
        hasCoderBodyFlag,
        hasCoderLabelFlag
      };
    }

    // Load persisted settings, then apply any query overrides (which also disable those inputs).
    function loadSettings() {
      const overrides = queryOverrides;
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved.repo) repoInput.value = saved.repo;
        if (saved.dri) driInput.value = saved.dri;
        if (saved.coderBodyFlag) coderBodyInput.value = saved.coderBodyFlag;
        if (saved.coderLabelFlag) coderLabelInput.value = saved.coderLabelFlag;
        if (saved.handle) handleInput.value = normalizeHandle(saved.handle);
        if (saved.token) tokenInput.value = saved.token;
      } catch (_) {
        // ignore malformed storage
      }
      if (overrides.repo) repoInput.value = overrides.repo;
      if (overrides.dri) driInput.value = overrides.dri;
      if (overrides.coderBodyFlag) coderBodyInput.value = overrides.coderBodyFlag;
      if (overrides.coderLabelFlag) coderLabelInput.value = overrides.coderLabelFlag;
      if (overrides.handle) handleInput.value = normalizeHandle(overrides.handle);
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

    function persistNotes() {
      try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(notesStore));
      } catch (_) {
        // ignore storage errors
      }
    }

    function persistCardCache() {
      try {
        localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cardCache));
      } catch (_) {
        // ignore storage errors
      }
    }

    // Persist current settings unless a field is locked by query override.
    function saveSettings() {
      const overrides = queryOverrides;
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
  if (!overrides.hasHandle) data.handle = normalizeHandle(handleInput.value);
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

    // Snapshot current settings for use in queries and cache keys.
    function getState() {
      const repo = repoInput.value.trim() || DEFAULTS.repo;
      const driToken = driInput.value.trim() || DEFAULTS.dri;
      const handle = normalizeHandle(handleInput.value);
      const handleBare = handle.replace(/^@+/, '');
      const coderBodyFlag = coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag;
      const coderLabelFlag = coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag;
      return { repo, driToken, handle, handleBare, coderBodyFlag, coderLabelFlag };
    }

    function makeFingerprint(state) {
      return `${STORAGE_KEY}::${state.repo}::${state.driToken}::${state.handle}::${state.coderBodyFlag}::${state.coderLabelFlag}`;
    }

    function setStatus(section, text, state = '') {
      const el = statusEls[section];
      if (!el) return;
      el.textContent = text;
      el.dataset.state = state;
    }

    // Build GitHub search query from config template and current state.
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

    // Construct GitHub UI search URL for the "Open search" link.
    function buildSearchUrl(state, cfg) {
      const path = cfg.section === 'issues' ? 'issues' : 'pulls';
      const repo = state.repo || DEFAULTS.repo;
      return `https://github.com/${repo}/${path}?q=${encodeURIComponent(buildQuery(cfg, state))}`;
    }

    // Extract DRI handle and coder/reviewer role from body and labels using configured flags.
    function extractDri(item, opts = {}) {
      const driToken = opts.driToken || DEFAULTS.dri;
      const coderBodyFlag = opts.coderBodyFlag || DEFAULTS.coderBodyFlag;
      const coderLabelFlag = opts.coderLabelFlag || DEFAULTS.coderLabelFlag;
      const regex = new RegExp(`${escapeRegExp(driToken)}\\s*([^\\s]+)`, 'i');

      let match = null;
      let matchedSource = '';

      if (item?.body) {
        const bodyMatch = item.body.match(regex);
        if (bodyMatch) {
          match = bodyMatch;
          matchedSource = item.body;
        }
      }

      if (!match && Array.isArray(item?.labels)) {
        for (const label of item.labels) {
          if (!label?.name) continue;
          const labelMatch = label.name.match(regex);
          if (labelMatch) {
            match = labelMatch;
            matchedSource = label.name;
            break;
          }
        }
      }

      const handle = ensureAt(match?.[1]);
      if (!match) {
        return { handle, role: 'review' };
      }
      const author = (item?.user?.login || '').toLowerCase();
      const handleBare = handle.replace(/^@+/, '').toLowerCase();

      let role = 'review';
      if (handle !== 'not found') {
        const driTokenEsc = escapeRegExp(driToken);
        const handleBareEsc = escapeRegExp(handleBare);
        const coderFromAuthor = author && handleBare && author === handleBare;
        const coderFromBody =
          coderBodyFlag &&
          item?.body &&
          new RegExp(`${driTokenEsc}\\s*@?${handleBareEsc}\\s+${escapeRegExp(coderBodyFlag)}`, 'i').test(item.body);
        let coderFromLabel = false;
        if (coderLabelFlag && Array.isArray(item?.labels)) {
          coderFromLabel = item.labels.some((label) => {
            const name = label?.name || '';
            if (!name) return false;
            return new RegExp(escapeRegExp(coderLabelFlag), 'i').test(name);
          });
        }
        if (coderFromAuthor || coderFromBody || coderFromLabel) role = 'code';
      }

      return { handle, role };
    }

    // Present DRI with role label; replace your own handle with "you".
    function formatDri(dri, youHandle) {
      if (!dri || dri.handle === 'not found') return null;
      const roleLabel = dri.role === 'code' ? 'coder' : 'reviewer';
      const prettyHandle = youHandle && dri.handle.toLowerCase() === youHandle.toLowerCase()
        ? 'you'
        : dri.handle;
      return `DRI (${roleLabel}): ${prettyHandle}`;
    }

    // Render assignee line with optional action hints when you are involved.
    function formatAssignee(item, dri, state, opts = {}) {
      const { includeActionForYou = false } = opts;
      const assignee = extractAssignee(item);
      if (assignee === 'unassigned') return 'Assignee: unassigned';

      const assigneeBare = assignee.replace(/^@+/, '').toLowerCase();
      const author = (item?.user?.login || '').toLowerCase();
      const driHandle = (dri?.handle || '').replace(/^@+/, '').toLowerCase();
      const driRole = dri?.role;

      let suffix = '';
      if (driHandle && driRole === 'code') {
        if (assigneeBare && assigneeBare !== driHandle) {
          suffix = ' (reviewing)';
        }
      } else if (driHandle && driRole === 'review') {
        if (assigneeBare && assigneeBare === author && author && author !== driHandle) {
          suffix = ' (coding)';
        }
      }

      const youHandle = (state?.handle || '').toLowerCase();
      const isYou = youHandle && assignee.toLowerCase() === youHandle;
      const label = isYou ? 'you' : assignee;

      let action = '';
      if (includeActionForYou && isYou) {
        if (driRole === 'code') action = 'pls code';
        else if (driRole === 'review') action = 'pls review';
      }

      return `Assignee: ${label}${suffix}${action ? ` (${action})` : ''}`;
    }

    // Assignee helper: returns "@user" or "unassigned".
    function extractAssignee(item) {
      const assignees = item.assignees || [];
      return assignees[0]?.login ? ensureAt(assignees[0].login) : 'unassigned';
    }

    // Notes persistence helpers (local-only).
    function noteKey(state, item) {
      return `${state.repo || DEFAULTS.repo}#${item.id}`;
    }

    function getNoteEntry(key) {
      return notesStore[key] || { text: '', isRed: false };
    }

    function registerNoteBinding(key, binding) {
      if (!noteBindings.has(key)) noteBindings.set(key, new Set());
      noteBindings.get(key).add(binding);
    }

    function applyNoteState(binding, entry) {
      binding.input.value = entry.text || '';
      binding.toggle.checked = !!entry.isRed;
      binding.wrapper.classList.toggle('is-red', !!entry.isRed);
    }

    function pruneNoteBindings() {
      noteBindings.forEach((bindings, key) => {
        bindings.forEach((binding) => {
          if (!binding.wrapper?.isConnected) bindings.delete(binding);
        });
        if (bindings.size === 0) noteBindings.delete(key);
      });
    }

    function syncNoteMirrors(key, entry, origin) {
      const bindings = noteBindings.get(key);
      if (!bindings) return;
      bindings.forEach((binding) => {
        if (!binding.wrapper?.isConnected) {
          bindings.delete(binding);
          return;
        }
        if (binding === origin) return;
        applyNoteState(binding, entry);
      });
      if (bindings.size === 0) noteBindings.delete(key);
    }

    function updateNote(key, entry, origin) {
      notesStore[key] = entry;
      persistNotes();
      syncNoteMirrors(key, entry, origin);
    }

    function renderNote(li, state, item) {
      const key = noteKey(state, item);
      const entry = getNoteEntry(key);
      const wrapper = createEl('div', 'note');

      const row = createEl('div', 'note-row');
      const input = createEl('input', 'note-input');
      input.type = 'text';
      input.maxLength = 120;
      input.placeholder = 'Short note (saved locally)';

      const toggle = createEl('label', 'tag-toggle');
      const toggleInput = createEl('input');
      toggleInput.type = 'checkbox';
      toggle.title = 'Mark important';
      toggle.append(toggleInput, createEl('span', null, '!'));

      const binding = { input, toggle: toggleInput, wrapper };
      applyNoteState(binding, entry);
      registerNoteBinding(key, binding);

      const persist = () => {
        const next = { text: input.value, isRed: toggleInput.checked };
        applyNoteState(binding, next);
        updateNote(key, next, binding);
      };

      input.addEventListener('input', persist);
      toggleInput.addEventListener('change', persist);

      row.append(input, toggle);
      wrapper.append(row);
      li.appendChild(wrapper);
    }

    // Adds DRI/assignee meta lines atop each list item based on card type.
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

    // Reset a section to "not loaded" UI state.
    function markSectionStale(section) {
      setStatus(section, 'Not loaded', '');
      cardsForSection(section).forEach((cardState) => {
        cardState.count.textContent = '–';
        setListPlaceholder(cardState.list, 'Not loaded yet.');
      });
    }

    // Build the DOM for a single card and wire its reload handler.
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
        const state = getState();
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

    // Update search URLs and query hints whenever inputs change.
    function renderQueries() {
      const state = getState();
      cards.forEach(({ cfg, searchLink, hint }) => {
        const query = buildQuery(cfg, state);
        searchLink.href = buildSearchUrl(state, cfg);
        hint.textContent = query;
      });
    }

    function renderTitle() {
      if (!repoTitle) return;
      const title = repoInput.value.trim();
      repoTitle.textContent = title || 'Repository triage snapshot';
    }

    // If cache fingerprint matches, hydrate cards from stored results.
    function hydrateCardsFromCache(state) {
      if (!cardCache?.fingerprint || cardCache.fingerprint !== makeFingerprint(state)) return;
      const sectionHasCache = new Set();
      Object.entries(cardCache.cards || {}).forEach(([id, payload]) => {
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

    // GitHub search API fetch wrapper with minimal error surfacing.
    async function fetchSearch(query, token) {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=8&sort=updated&order=desc`;
      const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (token) {
        headers['Authorization'] = token.startsWith('gh') ? `token ${token}` : `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.message || res.statusText;
        throw new Error(`${res.status}: ${msg}`);
      }
      return res.json();
    }

    // Render list items for a card, with fallbacks for empty/error states.
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
          if (assignee !== 'unassigned') {
            parts.unshift(`Assignee: ${assignee}`);
          }
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
          if (driBody) {
            parts.unshift(driBody);
          }
        }
        meta.textContent = parts.join(' · ');
        li.append(a, meta);
        renderNote(li, state, item);
        list.appendChild(li);
      });
    }

    // Fetch and render a single card, updating cache on success.
    async function refreshCard(cardState, state, token) {
      const query = buildQuery(cardState.cfg, state);
      cardState.count.textContent = '…';
      setListPlaceholder(cardState.list, 'Loading…');
      cardState.card.classList.add('is-loading');
      try {
        await rateLimit(token);
        lastFetchAt = Date.now();
        const data = await fetchSearch(query, token);
        cardState.count.textContent = data.total_count?.toLocaleString?.() || data.total_count || '0';
        renderItems(cardState, data.items || [], state);
        cardCache = cardCache || { fingerprint: '', cards: {} };
        cardCache.fingerprint = makeFingerprint(state);
        cardCache.cards = cardCache.cards || {};
        cardCache.cards[cardState.cfg.id] = {
          items: data.items || [],
          total_count: data.total_count
        };
        persistCardCache();
      } catch (err) {
        cardState.count.textContent = '!';
        setListPlaceholder(cardState.list, err.message, 'error-text');
        throw err;
      } finally {
        cardState.card.classList.remove('is-loading');
      }
    }

    // Utility to group cards by section key.
    function cardsForSection(section) {
      return Array.from(cards.values()).filter((c) => c.cfg.section === section);
    }

    // Sequentially refresh all cards in a section with throttling between calls.
    async function refreshSection(section) {
      const sectionCards = cardsForSection(section);
      if (sectionCards.length === 0) return;
      const token = tokenInput.value.trim();
      const state = getState();
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
        if (i < sectionCards.length - 1) {
          await sleep(delay);
        }
      }
      if (errors > 0) {
        setStatus(section, `Completed with ${errors} error(s).`, 'error');
      } else {
        setStatus(section, 'Updated.', 'ok');
      }
    }

    // Bootstraps the UI, loads persisted settings, wires listeners, and hydrates from cache.
    function init() {
      loadSettings();
      config.forEach(makeCard);
      renderQueries();
      renderTitle();
      Object.keys(loadButtons).forEach(markSectionStale);
      hydrateCardsFromCache(getState());

      const persistAndRender = () => {
        saveSettings();
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

      repoInput.addEventListener('input', persistAndRender);
      driInput.addEventListener('input', persistAndRender);
      coderBodyInput.addEventListener('input', persistAndRender);
      coderLabelInput.addEventListener('input', persistAndRender);
      handleInput.addEventListener('input', persistAndRender);
      tokenInput.addEventListener('input', persistAndRender);
      repoInput.addEventListener('change', persistAndRender);
      driInput.addEventListener('change', persistAndRender);
      coderBodyInput.addEventListener('change', persistAndRender);
      coderLabelInput.addEventListener('change', persistAndRender);
      handleInput.addEventListener('change', persistAndRender);
      tokenInput.addEventListener('change', persistAndRender);
      Object.entries(loadButtons).forEach(([section, btn]) => {
        if (btn) btn.addEventListener('click', () => refreshSection(section));
      });
    }

    init();
