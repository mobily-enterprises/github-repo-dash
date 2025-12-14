import { NO_TOKEN_DELAY_MS } from './config.js';
import { sleep } from './utils.js';

let lastFetchAt = 0;

export async function rateLimit(token) {
  if (token) return;
  const now = Date.now();
  const wait = Math.max(0, NO_TOKEN_DELAY_MS - (now - lastFetchAt));
  if (wait > 0) await sleep(wait);
}

export function markFetched() {
  lastFetchAt = Date.now();
}

export async function fetchSearch(query, token) {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=8&sort=updated&order=desc`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) headers.Authorization = token.startsWith('gh') ? `token ${token}` : `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json();
}
