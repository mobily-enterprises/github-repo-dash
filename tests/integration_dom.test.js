import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../docs/config.js';

function setupDomFromIndex() {
  const htmlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new DOMParser().parseFromString(html, 'text/html');
  // Remove scripts/fonts/preconnects to avoid side effects; we import app.js explicitly.
  dom.querySelectorAll('script').forEach((s) => s.remove());
  dom
    .querySelectorAll('link[rel="preconnect"], link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]')
    .forEach((l) => l.remove());
  document.documentElement.innerHTML = dom.documentElement.innerHTML;
}

describe('app integration (DOM wiring)', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    setupDomFromIndex();
    // Stub fetch to avoid outgoing requests (fonts, etc.).
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      headers: new Headers()
    }));
    await import('../docs/app.js');
  });

  it('renders all cards into the grids and keeps statuses initialized', () => {
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(config.length);
    expect(document.getElementById('status-pulls')?.textContent).toBe('Not loaded');
    expect(document.getElementById('status-triage')?.textContent).toBe('Not loaded');
    expect(document.getElementById('status-issues')?.textContent).toBe('Not loaded');
  });

  it('updates repo title when repo input changes', async () => {
    const repoInput = document.getElementById('repo');
    repoInput.value = 'owner/repo';
    repoInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('repo-title').textContent).toBe('owner/repo');
  });

  it('clears token via the clear button without errors', () => {
    const tokenInput = document.getElementById('token');
    const clearBtn = document.getElementById('clear-token');
    tokenInput.value = 'ghp_test';
    clearBtn.click();
    expect(tokenInput.value).toBe('');
  });
});
