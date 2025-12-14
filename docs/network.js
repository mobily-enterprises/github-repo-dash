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

function parseErrorMessage(body, fallback) {
  if (!body) return fallback;
  if (typeof body === 'string') return body;
  if (Array.isArray(body.errors) && body.errors[0]?.message) return body.errors[0].message;
  if (body.message) return body.message;
  if (body.documentation_url) return body.documentation_url;
  return fallback;
}

export async function fetchSearch(query, token, opts = {}) {
  const { signal } = opts;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=8&sort=updated&order=desc`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) headers.Authorization = token.startsWith('gh') ? `token ${token}` : `Bearer ${token}`;
  try {
    const res = await fetch(url, { headers, signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = parseErrorMessage(body, res.statusText);
      const err = new Error(`GitHub search failed: ${res.status} ${msg}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    if (err?.name === 'AbortError') {
      const abortErr = new Error('Request aborted');
      abortErr.code = 'aborted';
      throw abortErr;
    }
    throw err;
  }
}
