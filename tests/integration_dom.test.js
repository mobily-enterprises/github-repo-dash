import { describe, it, expect, beforeEach, vi } from 'vitest';

import { config } from '../docs/config.js';

function setupDom() {
  document.body.innerHTML = `
    <div class="page">
      <header>
        <div class="title">
          <h1 id="repo-title">Repository triage snapshot</h1>
        </div>
        <div class="controls" id="controls-panel">
          <div class="control-row">
            <label>Repository <input id="repo" type="text" placeholder="owner/repo" /></label>
            <label>Your handle <input id="handle" type="text" value="@me" /></label>
            <label title="Optional; stored on this device (localStorage)">
              <span class="label-title">GitHub token <span class="help-icon">?</span></span>
              <div class="token-input-row">
                <input id="token" type="password" placeholder="ghp_xxx" />
                <button id="clear-token" type="button">×</button>
              </div>
            </label>
          </div>
          <details class="advanced">
            <summary>Advanced</summary>
            <div class="advanced-grid">
              <label>DRI <input id="dri" type="text" value="DRI:@" /></label>
              <label>Coder body <input id="coder-body-flag" type="text" value="coder" /></label>
              <label>Coder label <input id="coder-label-flag" type="text" value="DRI_is_coder" /></label>
              <label class="checkbox-row">
                <input id="use-labels" type="checkbox" />
                <span>Look in body for DRI:@… and coder flags (off = labels)</span>
              </label>
            </div>
          </details>
        </div>
      </header>
      <section>
        <div class="section-header">
          <h2>Your pull requests</h2>
          <div class="actions">
            <button id="load-pulls">Load</button>
            <div id="status-pulls" class="status" aria-live="polite">Not loaded</div>
          </div>
        </div>
        <div class="grid" id="prs-grid"></div>
      </section>
      <section>
        <div class="section-header">
          <h2>PR assigning and triaging</h2>
          <div class="actions">
            <button id="load-triage">Load</button>
            <div id="status-triage" class="status" aria-live="polite">Not loaded</div>
          </div>
        </div>
        <div class="grid priority-grid" id="triage-priority-grid"></div>
        <div class="grid" id="triage-grid"></div>
      </section>
      <section>
        <div class="section-header">
          <h2>Issues</h2>
          <div class="actions">
            <button id="load-issues">Load</button>
            <div id="status-issues" class="status" aria-live="polite">Not loaded</div>
          </div>
        </div>
        <div class="grid" id="issues-grid"></div>
      </section>
    </div>
  `;
}

describe('app integration (DOM wiring)', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    setupDom();
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
