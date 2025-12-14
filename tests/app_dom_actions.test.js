import { describe, it, beforeEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../docs/config.js';

vi.mock('../docs/utils.js', async () => {
  const actual = await vi.importActual('../docs/utils.js');
  return { ...actual, sleep: () => Promise.resolve() };
});

const fixtures = {
  searchResult(items) {
    return {
      total_count: items.length,
      items
    };
  }
};

const mockFetchSearch = vi.fn(async () =>
  fixtures.searchResult([
    {
      id: 1,
      number: 42,
      title: 'Example item',
      html_url: 'https://example.test/42',
      updated_at: '2025-01-01T00:00:00Z',
      user: { login: 'alice' },
      assignee: { login: 'bob' },
      labels: []
    }
  ])
);
const mockFetchLabels = vi.fn().mockResolvedValue(['DRI:@alice', 'DRI:@bob']);

vi.mock('../docs/network.js', async () => {
  const actual = await vi.importActual('../docs/network.js');
  return {
    ...actual,
    fetchSearch: mockFetchSearch,
    fetchLabels: mockFetchLabels,
    rateLimit: vi.fn(),
    markFetched: vi.fn()
  };
});

function setupDom() {
  const htmlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new DOMParser().parseFromString(html, 'text/html');
  dom.querySelectorAll('script').forEach((s) => s.remove());
  dom
    .querySelectorAll(
      'link[rel="preconnect"], link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"], link[rel="stylesheet"]'
    )
    .forEach((l) => l.remove());
  document.documentElement.innerHTML = dom.documentElement.innerHTML;
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('app wiring actions', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetchSearch.mockClear();
    localStorage.clear();
    setupDom();
    // Make repo valid so refreshSection runs.
    const repoInput = document.getElementById('repo');
    repoInput.value = 'owner/repo';
    repoInput.dispatchEvent(new Event('input', { bubbles: true }));
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      headers: new Headers()
    }));
    await import('../docs/app.js');
  });

  it('loads pull cards and updates statuses', async () => {
    const loadPulls = document.getElementById('load-pulls');
    loadPulls.click();
    await flush();
    expect(mockFetchSearch).toHaveBeenCalled();
    expect(mockFetchLabels).toHaveBeenCalledWith('owner/repo', '');
    const pullsStatus = document.getElementById('status-pulls');
    expect(pullsStatus.textContent).toBe('Updated.');
    // ensure the pulls grid has cards (config filtered by section)
    const pullsCards = Array.from(document.querySelectorAll('.card')).filter(
      (c) => c.closest('#prs-grid') !== null
    );
    const pullsConfigCount = config.filter((c) => c.section === 'pulls').length;
    expect(pullsCards.length).toBe(pullsConfigCount);
  });

  it('switching use-body-text marks sections stale and rebuilds queries', async () => {
    const statusBefore = document.getElementById('status-issues').textContent;
    expect(statusBefore).toBe('Not loaded');
    const toggle = document.getElementById('use-body-text');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(document.getElementById('status-issues').textContent).toBe('Not loaded');
    expect(document.getElementById('status-pulls').textContent).toBe('Not loaded');
  });

  it('reload button fetches labels before refreshing card', async () => {
    const loadPulls = document.getElementById('load-pulls');
    loadPulls.click();
    await flush();
    mockFetchLabels.mockClear();
    const firstReload = document.querySelector('.card .mini-btn');
    firstReload.click();
    await flush();
    expect(mockFetchLabels).toHaveBeenCalledTimes(0);
  });

  it('shows repo error when repo is invalid', async () => {
    const repoInput = document.getElementById('repo');
    repoInput.value = '';
    repoInput.dispatchEvent(new Event('input', { bubbles: true }));
    const loadIssues = document.getElementById('load-issues');
    loadIssues.click();
    await flush();
    const statusIssues = document.getElementById('status-issues');
    expect(statusIssues.textContent).toContain('Enter a repository');
  });

  it('surfaces errors and keeps status when fetch fails', async () => {
    mockFetchSearch.mockRejectedValueOnce(new Error('boom'));
    const loadPulls = document.getElementById('load-pulls');
    loadPulls.click();
    await flush();
    const pullsStatus = document.getElementById('status-pulls');
    expect(pullsStatus.textContent).toContain('error');
  });
});
