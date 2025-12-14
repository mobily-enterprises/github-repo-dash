# GitHub Repo Dash

A lightweight, static dashboard for triaging GitHub repositories. It shows live counts and recent items for issues and pull requests using GitHub Search, with cards for common states (unlabeled issues, PRs without DRIs, your assignments, etc.). Everything runs in the browser; just provide a repo name and, optionally, a personal access token for higher rate limits.

## Dashboard

Open `docs/index.html` locally or via a simple static server to use the dashboard.

- Dashboard page: [docs/index.html](docs/index.html)
- Repository: mobily-enterprises/github-repo-dash

## Notes

- Tokens are stored in localStorage for convenience; use the inline clear control to remove them.
- The page fetches from the GitHub API directly and applies a strict Content Security Policy; no backend is required.
