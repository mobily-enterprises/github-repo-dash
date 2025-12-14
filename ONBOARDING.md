# Onboarding: Understanding GitHub Repo Dash

Welcome! This guide walks you through the codebase so you can confidently make changes without getting lost. It is intentionally long and tutorial‑style: we will start with the mental model (what the dashboard does and why), then tour the files, then dive into the runtime flow with real code snippets, and finally show how to extend and test safely.

## What this project is (and is not)

- A **static, browser-only dashboard** served from `docs/` (works on GitHub Pages). There is no backend.
- It surfaces **GitHub Search** results as cards for common triage/ownership states (unowned PRs, your assignments, etc.).
- Everything is written as **ES modules** and wired by a small state store; no frameworks.
- User data (repo, handle, token, toggle choices, notes, caches) lives in **localStorage**.
- A strict **CSP** is in place: no inline scripts/styles; assets live in `docs/`.

## The workflow and vocabulary (DRI, coder vs reviewer)

The dashboard assumes every PR/issue has a **Directly Responsible Individual (DRI)** and exactly one **assignee** (the person currently working it). The DRI can play two roles:

- **Reviewer** (most common): expected to review/shepherd. This is the default when the DRI is not the author and there is no coder flag.
- **Coder** (only when it’s truly theirs to code): happens when the DRI is the author **or** is explicitly forced into coder mode (e.g., author is MIA) via a body flag like `DRI:@alice coder` or a label like `DRI_is_coder`.

Labels typically look like `DRI:@maintainer1`, `DRI_is_coder`, etc. There is always exactly one assignee at a time; the assignee “bounces” between coder and reviewer as work changes hands.

## High-level architecture (read this once)

```
docs/
  index.html         # Shell page, CSP-safe, loads modules.
  style.css          # Tokens + layout.
  app.js             # Entry point: wires DOM, state, events, rendering.
  config.js          # Card catalog + constants + defaults.
  core.js            # Query building + URL overrides.
  dri.js             # DRI/assignee extraction and formatting.
  state.js           # Tiny pub/sub state store.
  storage.js         # localStorage settings, notes, cache.
  notes.js           # Per-item notes UI with local sync.
  network.js         # GitHub search fetch + rate limiting.
  utils.js           # Helpers (DOM builders, validation, sleep).

tests/               # Vitest + happy-dom. Logic + DOM integration coverage.
```

`app.js` orchestrates everything: reads inputs, normalizes state, renders cards from `config.js`, builds queries via `core.js`, fetches through `network.js`, decorates items with DRI/assignee info from `dri.js`, persists via `storage.js`, and mirrors notes through `notes.js`.

## Running the app locally

Module imports require a server. From the repo root:

```bash
npm install
npm run serve   # prints a local URL; open it in the browser
```

The dashboard lives at `docs/index.html` and works the same on GitHub Pages.

## The startup sequence (what happens on load)

The entry point is `docs/app.js`. On load it:

1) **Reads query param overrides** (repo, handle, flags) via `getQueryOverrides()` in `core.js`. These can lock inputs.
2) **Loads saved settings** from localStorage into inputs via `loadSettings()` in `storage.js`.
3) **Builds cards** from `config` (see below).
4) **Initializes state** with `initState()` from `state.js` using normalized input values.
5) **Saves settings** back to storage to ensure defaults are persisted.
6) **Renders queries and title**, marks cards stale, and **hydrates from cache** if the fingerprint matches.
7) **Hooks event listeners** for inputs, the DRI-source toggle, clear-token button, and load buttons.

Key snippet (trimmed):

```js
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
```

`normalizeAppState` ensures blank fields fall back to `DEFAULTS` (repo/handle/DRI token/coder flags/useLabels).

## Card catalog (`docs/config.js`)

Each card is declarative: `id`, `section` (issues/pulls/triage), label/title/desc, and a **query template**. Templates use tokens:

- `__DRI_HANDLE__` → either `label:"DRI:@you"` or `in:body "DRI:@you"` depending on the “Look in body” toggle.
- `__DRI__` → DRI token without a handle (same label/body switch).
- `__HANDLE_BARE__` / `__HANDLE__` → your handle with/without `@`.

Example:

```js
{
  id: 'prs-dri-waiting',
  section: 'pulls',
  label: 'DRI waiting',
  query: 'is:pr is:open __DRI_HANDLE__ -assignee:__HANDLE_BARE__'
}
```

The `config` also declares sets that drive extra meta rendering:

- `TOP_META_DRI_IDS` and `YOUR_ROLE_IDS` decide when to show DRI/role hints.
- `TOP_META_ASSIGNEE_IDS` decides when to show assignee info on top.

Defaults and constants (timeouts, storage keys, regex) also live here.

## Query building (`docs/core.js`)

`buildQuery(cfg, state)` replaces tokens based on the **source of DRI data**:

```js
const replacement = state.useLabels
  ? (token) => `in:body "${token}"`   // when “Look in body” is ON
  : (token) => `label:"${token}"`;    // default: labels

const query = cfg.query
  .replace(/__DRI_HANDLE__/g, replacement(`${state.driToken}${state.handleBare}`))
  .replace(/__HANDLE__/g, state.handle)
  .replace(/__HANDLE_BARE__/g, state.handleBare)
  .replace(/__DRI__/g, replacement(state.driToken));

return state.repo ? `repo:${state.repo} ${query.trim()}` : query.trim();
```

`getQueryOverrides()` reads `?repo=...&handle=@you&use_labels=true|false&dri_token=...&coder_body_flag=...&coder_label_flag=...` and returns values plus “hasX” booleans so inputs can be disabled when locked by URL.

## State store (`docs/state.js`)

A minimal observable store:

- `initState(initial)` sets the first snapshot.
- `setState(patch)` merges or accepts a function, updates `currentState`, and notifies listeners.
- `getState()` returns the snapshot.
- `subscribe(fn)` lets you react to changes; returns an unsubscribe.

`app.js` uses this to keep normalized app state in sync with inputs and to re-render query hints/title.

## Settings, notes, and cache (`docs/storage.js`)

Responsibilities:

- **Load and persist settings** (repo/handle/DRI tokens/coder flags/toggle/token) to `localStorage` under `STORAGE_KEY`.
- **Honor query overrides** by disabling/locking inputs when params are present.
- **Normalize handles** (always start with `@`).
- **Notes store** keyed by `repo#itemId` (`NOTES_KEY`).
- **Card cache** keyed by fingerprint (`CARDS_CACHE_KEY`) with per-card `cachedAt`.
- **Freshness check**: `isCacheFresh(cache, ttl)` uses the latest per-card timestamp (per-card TTL) to decide freshness.

Example: pulling a state snapshot from inputs (used at init):

```js
export function getState(inputs) {
  const { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, useLabelsInput } = inputs;
  const repo = repoInput.value.trim() || DEFAULTS.repo;
  const driToken = driInput.value.trim() || DEFAULTS.dri;
  const handle = normalizeHandle(handleInput.value || DEFAULTS.handle, DEFAULTS.handle);
  const handleBare = handle.replace(/^@+/, '');
  const coderBodyFlag = coderBodyInput.value.trim() || DEFAULTS.coderBodyFlag;
  const coderLabelFlag = coderLabelInput.value.trim() || DEFAULTS.coderLabelFlag;
  const useLabels = useLabelsInput ? !!useLabelsInput.checked : DEFAULTS.useLabels;
  return { repo, driToken, handle, handleBare, coderBodyFlag, coderLabelFlag, useLabels };
}
```

`makeFingerprint(state)` includes repo/DRI/handle/coder flags so caches are invalidated when any of these change.

## DRI and assignee parsing (`docs/dri.js`)

`extractDri(item, opts)` looks for a DRI token in the body first, then labels, using the configured token (`DRI:@`) and coder flags. It returns `{ handle, role }` where `role` is `'code'` or `'review'`.

Key logic:

- If the handle matches the author, role becomes `code`.
- If the body has `DRI:@alice coder` (body flag) or labels include `DRI_is_coder` (label flag), role becomes `code`.
- Otherwise role stays `review`.

Formatting helpers:

- `formatDri(dri, youHandle)` → `DRI (coder): you`
- `extractAssignee(item)` / `formatAssignee(item, dri, state, { includeActionForYou })` add hints like `(pls code)` when you’re the assignee and the role implies action.

## Network and rate limiting (`docs/network.js`)

`rateLimit(token)` waits `NO_TOKEN_DELAY_MS` between searches when no token is provided. With a token, it returns immediately.

`fetchSearch(query, token, opts)` calls the GitHub Search API with sane headers. Errors are normalized:

- Non‑200: parses JSON, uses nested errors when available.
- Abort: throws an error with `code: 'aborted'` and message `Request aborted`.

This is already abstracted for tests; you can stub `fetch` in Vitest.

## Rendering and interaction flow (`docs/app.js`)

### Building cards

`config.forEach(makeCard)` creates DOM for each card:

- Header with label, count, and “Reload” button (per-card refresh).
- Title/description.
- List of items (with placeholders while empty/loading).
- Footer with “Open search” link and rendered query string.

Each card is stored in a `Map` keyed by `id`.

### Rendering queries and title

`renderQueries()` reads `getStoreState()` and updates each card’s footer:

```js
const validRepo = isValidRepo(state.repo, REPO_REGEX);
searchLink.href = validRepo ? buildSearchUrl(state, cfg) : '#';
hint.textContent = validRepo ? buildQuery(cfg, state) : 'Enter owner/repo to build query';
```

`renderTitle()` updates the page heading to `owner/repo` or a placeholder.

### Hydrating from cache

`hydrateCardsFromCache(state)`:

- Checks fingerprint match.
- For each cached card, verifies freshness via `isCacheFresh` (per-card timestamps).
- Restores count and items, sets status to “Loaded from cache (fresh)” or “Cache expired; please reload.”

### Rendering items

`renderItems(cardState, items, state)` builds list entries:

- Adds top meta lines (DRI + your role + assignee) based on `cfg.id` and the sets from `config`.
- Renders `#number title` as a link.
- Shows `user · updated <date>` plus assignee info for specific cards.
- Injects the per-item note UI via `renderNote`.

### Refreshing data

- Section-level “Load” buttons call `refreshSection(section)` which:
  - Validates repo input.
  - Applies token/no-token delay between cards.
  - For each card: `refreshCard` → `rateLimit` → `fetchSearch` → update count/list → persist cache.
  - Sets status to “Updated.” or error count.

### State updates from inputs

Inputs call `applyStatePatch({ field: value })`, which:

- Merges with current state, normalizes via `normalizeAppState`.
- Persists to storage.
- Re-renders queries/title.
- Marks all sections stale (so the user reloads with fresh params).

The “clear token” button empties the token field and triggers the same flow.

### Toggle: “Look in body for DRI:@… and coder flags (off = labels)”

- When changed, state updates and **all cards are marked stale** because queries change.
- Persisted in localStorage; can also be forced via `?use_labels=true|false`.
- When ON, DRI tokens are searched in `in:body`; when OFF (default), in labels.

## Notes subsystem (`docs/notes.js`)

- Notes are keyed by `repo#itemId` via `noteKey`.
- Each rendered note registers bindings (input + red “!” toggle) in `noteBindings`.
- When one note changes, all mirrored bindings for the same key are updated (so multiple cards showing the same item stay in sync).
- Persistence goes through `storage.persistNotes()` to `localStorage`.

## Local storage keys

- `STORAGE_KEY`: settings (repo/dri/handle/token/toggle/coder flags).
- `NOTES_KEY`: map of `{ "<repo>#<itemId>": { text, isRed } }`.
- `CARDS_CACHE_KEY`: `{ fingerprint, cards: { [id]: { items, total_count, cachedAt } } }`.
- TTL is per-card; fingerprint includes repo/handle/DRI/coder flags so caches invalidate on parameter changes.

## Styles and CSP (`docs/style.css`)

- Design tokens: spacing (`--space-*`), radii (`--radius-*`), colors. Reuse them.
- No inline styles/scripts; all CSS/JS lives in files imported by `index.html`.
- There is a skip link, focus rings, and accessible labels—preserve these patterns.

## Testing: how to get confidence quickly

- **Runner**: Vitest with `happy-dom` (`npm test` or `npm test -- --coverage`).
- **Coverage gate**: 99% on logic modules; `docs/app.js` is excluded by design.
- **Patterns**:
  - Logic tests: import functions directly (e.g., `buildQuery`, `extractDri`, storage helpers).
  - DOM integration: `tests/*dom*.test.js` render `index.html` snippets, stub `fetch`, and assert DOM text/content.
  - Clear `localStorage` in `beforeEach` when touching persisted data.
  - Stub network: `global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture })`.
- **Known noise**: happy-dom emits abort warnings when tearing down; tests still pass.

## How to add a new card (practical recipe)

1) Add an entry to `config.js` with `id`, `section`, `label`, `title`, `desc`, `query`.
2) If it needs top meta (DRI/assignee), add the `id` to the appropriate set (`TOP_META_DRI_IDS`, etc.).
3) Consider whether `__DRI__` or `__DRI_HANDLE__` is appropriate; use `__HANDLE_BARE__` when you need a bare handle.
4) Run `npm test` to ensure query building and DOM hints still render.

## How to change DRI parsing or flags

Edit `DEFAULTS` in `config.js` (e.g., change `coderBodyFlag` or `coderLabelFlag`) and adjust `dri.js` tests if behavior changes. Remember that caches fingerprint on these values; changing them invalidates caches automatically.

## How to work with persistence safely

- Always go through `applyStatePatch` + `saveSettings` rather than mutating inputs directly; this keeps state, storage, and queries in sync.
- When adding new persisted fields, update:
  - `DEFAULTS` in `config.js`
  - `loadSettings` / `saveSettings` / `getState` in `storage.js`
  - `normalizeAppState` in `app.js`
  - `makeFingerprint` if the new field should invalidate caches

## Extending notes or cached data

- Notes: reuse `noteKey(state, item)`; keep payload small (current cap: 120 chars).
- Cache: per-card `cachedAt` is respected; if you add new per-card fields, ensure they are JSON‑safe and keep payload small to avoid localStorage bloat.

## Query params (power users and debugging)

- `?repo=owner/repo` — prefill/lock repo.
- `&handle=@you` — prefill/lock handle.
- `&dri_token=DRI:@` — override token prefix.
- `&coder_body_flag=coder` / `&coder_label_flag=DRI_is_coder` — override flags.
- `&use_labels=true|false` — toggle body vs labels (true = look in body; false = labels).

Locked fields are disabled in the UI; saved settings will not override them.

## Rendering pitfalls to avoid

- **Validate repo** before fetching (`isValidRepo` with `REPO_REGEX`); otherwise cards stay stale.
- **Mark stale** when parameters change—use `markAllSectionsStale()` or per-section to avoid mixing old data.
- **Per-card reload**: `reloadBtn` already calls `refreshCard`; if you add new side effects, keep it async and error-safe.
- **Accessible text**: keep labels and button text descriptive; reuse `aria` patterns already in `index.html`.

## Network safety and rate limits

- Without a token, searches are throttled to one every `NO_TOKEN_DELAY_MS` (10s). With a token, no delay.
- Tokens are stored in `localStorage` for convenience; a clear “×” button blanks the token and re-saves settings.
- Errors from GitHub are surfaced per-card; status shows “Completed with N error(s).”

## Adding UI features (checklist)

1) **State**: decide what is the source of truth. Prefer the store (`state.js`) for app-wide flags; mirror to inputs via `applyStatePatch`.
2) **Persistence**: wire through `storage.js` + `DEFAULTS`.
3) **Rendering**: keep DOM helpers simple; use `createEl` and `setListPlaceholder`.
4) **Accessibility**: label inputs, keep focus styles, avoid inline styles/scripts (CSP).
5) **Tests**: add a happy-dom test that renders the new control and asserts state + persistence + query impact.

## Example: adding a “Include drafts” toggle (hypothetical)

- Add `includeDrafts` to `DEFAULTS`.
- Update `storage.getState/loadSettings/saveSettings` and `app.normalizeAppState`.
- In `core.buildQuery`, append `draft:true` when flag is on.
- Render a checkbox in `index.html` with an `id`, wire it in `app.js` inputs map, and in `init()` add a `change` listener that calls `applyStatePatch({ includeDrafts: checkbox.checked })`.
- Add a DOM test that flips the toggle and ensures the query hint includes `draft:true`.

## How tests are organized (quick map)

- `tests/*dri*.test.js` — DRI parsing/formatting and role logic.
- `tests/storage*.test.js` — settings persistence, cache freshness, fingerprints.
- `tests/core*.test.js` — query building + overrides.
- `tests/network.test.js` — fetch error handling and headers.
- `tests/*dom*.test.js` — integration: render `index.html`, stub fetch, verify cards/notes/toggles.
- `tests/coverage_boost.test.js` — keeps thresholds green for edge branches.

Use `npm test -- --coverage` to see coverage (logic files are gated at 99%).

## Working with styles

`docs/style.css` defines spacing, typography, cards, buttons, notes, and status pills. Use the existing tokens (e.g., `var(--space-2)`, `var(--radius-2)`) and avoid introducing ad-hoc colors or inline styles to keep CSP and design consistent.

## FAQ (developer edition)

- **Why exclude `docs/app.js` from coverage?** It is mostly wiring/DOM plumbing; logic modules are fully covered to 99%. DOM flows are covered via integration tests instead.
- **Why is the token in localStorage?** Convenience: the dashboard is static and relies on the user’s PAT. A clear button removes it; the label is honest about storage.
- **Why does `hydrateCardsFromCache` show stale?** Each card has its own `cachedAt`. If any card is older than the TTL, that section is marked stale to prompt reload.
- **Do I need a backend to add CSP?** No. CSP is enforced by keeping JS/CSS in files and avoiding inline content; the static page works on GitHub Pages and local `npm run serve`.

## Ready to contribute

1) Install and serve: `npm install` + `npm run serve`.
2) Explore the UI, flip the “Look in body” toggle, and watch queries update in card footers.
3) Run `npm test` to confirm the harness works locally (expect happy-dom abort warnings).
4) Make a small change guided by this document; add or adjust a test.
5) Open a branch/PR referencing the issue, keep CSP intact, and ensure the coverage gate stays green.

That’s it. With this map, you should be able to navigate the codebase, extend it safely, and keep the dashboard lean, accessible, and predictable. Happy hacking!
