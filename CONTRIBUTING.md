# Contributing to GitHub Repo Dash

Thanks for helping! This project is a static, browser-only dashboard served from `docs/` (GitHub Pages friendly). There’s no backend; everything is ES modules and the GitHub Search API.

## Quick setup

- Node 18+ recommended.
- Install deps: `npm install`
- Run locally: `npm run serve` then open the printed URL (module imports won’t run from `file://`).

## Development workflow

- **Branches**: branch off `main`, keep PRs small, reference the issue (e.g., “fixes #N”).
- **Tests**: `npm test` (or `npm test -- --coverage`). Coverage gate is 99% across logic modules; `docs/app.js` is excluded because it’s the DOM entrypoint. Avoid hitting the real GitHub API—tests use happy-dom and stubbed fetch.
- **Lint/format**: `npm run lint` and `npm run format` (or `npm run format:write` to fix).
- **Types**: `npm run typecheck` (TypeScript in check mode for JS).
- **Serving**: keep assets under `docs/`; PRs should not add a backend.

## UI/style notes

- Reuse existing design tokens (`--space-*`, `--radius-*`, colors) in `docs/style.css`.
- Keep CSP-safe: inline scripts/styles are already moved out; don’t add inline script/style.
- Accessibility: preserve labels, aria attributes, skip link, and focus outlines.

## Testing guidelines

- Integration DOM tests live in `tests/*dom*.test.js` using happy-dom; stub network via `vi.mock`/`global.fetch`.
- Don’t rely on real GitHub responses; use fixtures.
- If adding new stateful DOM features, prefer a small helper function plus a happy-dom test.

## Local data

- Settings/notes/token are in `localStorage`; tests should clear `localStorage` between runs.
- Never commit real tokens. The token input is local-only and has a clear button; leave that behavior intact.

## PR checklist

- Lint, format, typecheck, tests (with coverage) pass.
- No regressions to CSP or local server workflow (`npm run serve` still loads `docs/index.html`).
- Reference the issue number in the PR title/body (`fixes #N` if closing).
