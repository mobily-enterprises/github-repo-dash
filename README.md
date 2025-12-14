# GitHub Repo Dash

A lightweight, static dashboard for triaging GitHub repositories. It shows live counts and recent items for issues and pull requests using GitHub Search, with cards for common states (unlabeled issues, PRs without DRIs, your assignments, etc.). Everything runs in the browser; just provide a repo name and, optionally, a personal access token for higher rate limits.

[Dashboard page](https://mobily-enterprises.github.io/github-repo-dash)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, and PR guidelines, and read the full codebase tour in [ONBOARDING.md](ONBOARDING.md).

## Workflow: DRI, Reviewer vs Coder, and Assignee

This dashboard is built around a DRI (Directly Responsible Individual) model:

- Every PR/issue has a **DRI**.
- The DRI plays one of two roles:
  - **Reviewer** (most common): expected to review and shepherd the change. This is the default when the DRI is not the author and there’s no coder flag.
  - **Coder** (only when it’s truly theirs to code): expected to write the code. The DRI becomes the coder only if they are the PR author, or if they are explicitly forced into coder mode (e.g., the author is MIA) via a body flag like `DRI:@alice coder` or a label like `DRI_is_coder`.
- There is always exactly **one assignee** at any time—the person currently working the item. The assignee “bounces” between coder and reviewer as ownership changes.

In practice, with labels, you’ll see labels like `DRI:@maintainer1`, `DRI:@maintainer2`, etc., to declare the DRI. The optional `DRI_is_coder` label or a `coder` flag in the body marks the DRI as the coder even if they’re not the author.

## What you see on first load

Open `docs/index.html` via a local server (e.g., `npm run serve` then http://localhost:3000/). You’ll see:

- **Repo field**: enter `owner/repo`. The dashboard won’t run searches until this is valid.
- **Handle field**: your GitHub handle (with `@`).
- **Token field**: optional PAT for higher rate limits; stored in localStorage; “×” clears it.
- **Load buttons** for Pulls, Triage, Issues sections.
- **Cards** are not loaded yet; status reads “Not loaded”.

By default, the dashboard searches **labels** for DRI (and coder flag) tokens. It expects labels like `DRI:@alice` and coder labels like `DRI_is_coder`. The DRI token text (`DRI:@`) and coder flag texts are configurable.

## Core cards and queries (defaults: labels)

- **Your pull requests**
  - *Blocking*: `is:pr is:open assignee:<you>`
  - *DRI waiting*: `is:pr is:open label:"DRI:@you" -assignee:<you>` (you’re DRI, someone else is assigned)
  - *DRI: You*: `is:pr is:open label:"DRI:@you"`
- **PR assigning and triaging**
  - *WAITING*: `is:pr is:open label:"DRI:@*"` with `no:assignee` (DRI declared, nobody assigned)
  - *Unowned*: `is:pr is:open NOT label:"DRI:@*"` (no DRI label)
  - *Owned*: `is:pr is:open label:"DRI:@*"` (has a DRI)
  - *Needs DRI*: `is:pr is:open assignee:* in:body NOT "DRI:@..."` (assigned but missing DRI token)
- **Issues**
  - *Untriaged*: `is:issue is:open no:label`
  - *In Progress*: `is:issue is:open assignee:*`
  - *Mine*: `is:issue is:open assignee:<you>`

Each query is prefixed with `repo:<owner/repo>` once you enter a valid repo.

### Toggle: “Look in body for DRI:@… and coder flags (off = labels)”

- Default: **off** → searches use labels (`label:"DRI:@user"` and `DRI_is_coder`).
- When **on**: searches use body text (`in:body "DRI:@user"` and body `coder` flag).
- Changing this toggle marks all cards stale; reload to re-run searches with the new source.

## Roles and metadata

When rendering items, the dashboard extracts DRI and coder/reviewer role:

- DRI comes from the selected source (labels by default, or body if toggled).
- DRI is the **coder** only if:
  - The DRI handle matches the author, or
  - You explicitly force coder mode with `coder` in the body near the DRI token, or a coder label (`DRI_is_coder`).
- Otherwise, the DRI is the **reviewer** (the common case).
- Assignee line shows who’s currently assigned; if you’re involved, hints like “(pls code)” or “(pls review)” appear.
- Notes: each item has a local note field with a red “!” toggle, stored in localStorage per repo+item.

## Controls and persistence

- **Repo**: required; validated as `owner/repo`.
- **Handle**: normalized to start with `@`.
- **Token**: optional PAT; stored in localStorage; “×” clears and removes it.
- **DRI token**: default `DRI:@`; used in queries and extraction.
- **Coder flags**: body flag `coder`, label flag `DRI_is_coder`; both configurable.
- **DRI source toggle**: labels vs body; persisted in settings.
- Settings, notes, and card cache are in localStorage; query params can override and lock fields (including `use_body_text=true/false`).

## How to use (quick workflow)

1. Serve the docs folder: `npm install` (once), then `npm run serve`, open the shown URL.
2. Enter `owner/repo` and your handle. Optionally paste a PAT and hit “×” to clear later.
3. Leave the DRI source toggle off to use labels (recommended). If your repo encodes DRI in bodies, turn it on.
4. Click “Load” on Pulls, Triage, Issues. Cards fill with counts and recent items.
5. Use inline notes to mark items; use “Reload” on a card to refresh it individually.
6. If you need to switch DRI source (labels vs body), toggle the checkbox; cards go stale; click “Load” again.

## Advanced: query params

You can prefill and lock fields via query params:

- `?repo=owner/repo`
- `&handle=@you`
- `&dri_token=DRI:@`
- `&coder_body_flag=coder`
- `&coder_label_flag=DRI_is_coder`
- `&use_body_text=true|false` (true = look in body; false = labels)

Locked fields become disabled in the UI.

## Notes

- Tokens are stored in localStorage for convenience; use the inline clear control to remove them.
- The page fetches from the GitHub API directly and applies a strict Content Security Policy; no backend is required. Serve via a local server (e.g., `npm run serve`); `file://` won’t work with module imports.

## Development

- Install deps: `npm install`
- Serve locally: `npm run serve`
- Tests (with coverage gate): `npm test` or `npx vitest run --coverage`
- Lint/format: `npm run lint` / `npm run format`
- Types (JS with TS checking): `npm run typecheck`
