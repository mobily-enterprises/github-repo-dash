import { describe, it, expect, beforeEach } from 'vitest';
import { getQueryOverrides, buildQuery } from '../docs/core.js';
import { formatDri, formatAssignee, extractDri } from '../docs/dri.js';
import { ensureAt, sleep, setListPlaceholder, escapeRegExp } from '../docs/utils.js';
import { loadSettings, saveSettings } from '../docs/storage.js';
import { DEFAULTS, STORAGE_KEY } from '../docs/config.js';

function createInputs() {
  const repoInput = document.createElement('input');
  const driInput = document.createElement('input');
  const coderBodyInput = document.createElement('input');
  const coderLabelInput = document.createElement('input');
  const handleInput = document.createElement('input');
  const tokenInput = document.createElement('input');
  const useLabelsInput = document.createElement('input');
  useLabelsInput.type = 'checkbox';
  return { repoInput, driInput, coderBodyInput, coderLabelInput, handleInput, tokenInput, useLabelsInput };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('core coverage bumps', () => {
  it('parses full overrides including coder flags', () => {
    window.history.replaceState(
      {},
      '',
      '/?repo=org/repo&dri_token=DRI:@bot&handle=dev&coder_body_flag=hack&coder_label_flag=mark'
    );
    const overrides = getQueryOverrides();
    expect(overrides.repo).toBe('org/repo');
    expect(overrides.dri).toBe('DRI:@bot');
    expect(overrides.handle).toBe('@dev');
    expect(overrides.coderBodyFlag).toBe('hack');
    expect(overrides.coderLabelFlag).toBe('mark');
    expect(overrides.hasCoderBodyFlag).toBe(true);
    expect(overrides.hasCoderLabelFlag).toBe(true);
    expect(overrides.hasRepo).toBe(true);
    expect(overrides.hasDri).toBe(true);
    expect(overrides.hasHandle).toBe(true);
  });

  it('builds in-body query when repo is empty and useLabels is on', () => {
    const cfg = { query: '__DRI__ __DRI_HANDLE__ __HANDLE__ __HANDLE_BARE__' };
    const state = {
      repo: '',
      driToken: 'DRI:@',
      handle: '@me',
      handleBare: 'me',
      coderBodyFlag: 'coder',
      coderLabelFlag: 'DRI_is_coder',
      useLabels: true
    };
    const query = buildQuery(cfg, state);
    expect(query.startsWith('repo:')).toBe(false);
    expect(query).toMatch(/in:body "DRI:@"/);
    expect(query).toMatch(/in:body "DRI:@me"/);
    expect(query).toContain('@me');
    expect(query).toContain('me');
  });
});

describe('utils edge cases', () => {
  it('ensureAt handles empty and prefixed handles', () => {
    expect(ensureAt('')).toBe('not found');
    expect(ensureAt('@alice')).toBe('@alice');
  });

  it('sleep resolves quickly', async () => {
    await sleep(0);
    expect(true).toBe(true);
  });

  it('setListPlaceholder populates list', () => {
    const list = document.createElement('ul');
    setListPlaceholder(list, 'empty');
    expect(list.querySelector('li')?.textContent).toBe('empty');
  });

  it('escapeRegExp escapes special chars', () => {
    expect(escapeRegExp('a.*+?^${}()|[]\\')).toBe('a\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });
});

describe('dri formatting branches', () => {
  it('formats coder without "you" substitution', () => {
    const text = formatDri({ handle: '@alice', role: 'code' }, '@bob');
    expect(text).toBe('DRI (coder): @alice');
  });

  it('formats assignee when you are not involved', () => {
    const item = { assignees: [{ login: 'charlie' }], user: { login: 'bob' } };
    const dri = { handle: '@alice', role: 'review' };
    const state = { handle: '@me' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toBe('Assignee: @charlie');
  });

  it('handles unknown roles and missing handles', () => {
    const item = { assignees: [{ login: 'me' }] };
    const dri = { handle: '@alice', role: 'other' };
    const state = { handle: '@me' };
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toBe('Assignee: you');
  });

  it('falls back when DRI handle and author are missing', () => {
    const item = { assignees: [{ login: 'someone' }] };
    const dri = {};
    const state = {};
    const text = formatAssignee(item, dri, state, { includeActionForYou: true });
    expect(text).toBe('Assignee: @someone');
  });

  it('extracts DRI using defaults and skips empty labels', () => {
    const item = {
      body: 'no dri present here',
      labels: [{}, { name: 'random' }, { name: 'DRI:@alice' }]
    };
    const dri = extractDri(item);
    expect(dri.handle).toBe('@alice');
    expect(dri.role).toBe('review');
  });

  it('skips coder label check when labels are missing', () => {
    const item = { body: 'DRI:@bob', user: { login: 'charlie' } };
    const dri = extractDri(item);
    expect(dri.handle).toBe('@bob');
  });

  it('skips coder label logic when flag is blank', () => {
    const item = { user: { login: 'bob' }, labels: [{ name: 'DRI:@bob' }] };
    const dri = extractDri(item, { coderLabelFlag: '' });
    expect(dri.role).toBe('code');
  });
});

describe('storage branches', () => {
  it('loads defaults and coerces weird toggle values', () => {
    const inputs = createInputs();
    inputs.useLabelsInput.checked = 'maybe';
    loadSettings(inputs, {});
    expect(inputs.tokenInput.value).toBe(DEFAULTS.token);
    expect(inputs.useLabelsInput.checked).toBe(DEFAULTS.useLabels);
  });

  it('respects overrides and trims values on save', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        repo: 'saved/repo',
        dri: 'savedDri',
        coderBodyFlag: 'savedBody',
        coderLabelFlag: 'savedLabel',
        handle: '@saved',
        token: 'old',
        useLabels: false
      })
    );
    const inputs = createInputs();
    inputs.repoInput.value = 'new/repo';
    inputs.driInput.value = ' DRI:@new ';
    inputs.coderBodyInput.value = ' newBody ';
    inputs.coderLabelInput.value = ' newLabel ';
    inputs.handleInput.value = ' newHandle ';
    inputs.tokenInput.value = ' secret ';
    inputs.useLabelsInput.checked = true;
    const overrides = {
      hasRepo: true,
      hasDri: false,
      hasCoderBodyFlag: false,
      hasCoderLabelFlag: true,
      hasHandle: true,
      hasUseLabels: false
    };
    saveSettings(inputs, overrides);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.repo).toBe('saved/repo');
    expect(saved.dri).toBe('DRI:@new');
    expect(saved.coderBodyFlag).toBe('newBody');
    expect(saved.coderLabelFlag).toBe('savedLabel');
    expect(saved.handle).toBe('@saved');
    expect(saved.token).toBe('secret');
    expect(saved.useLabels).toBe(true);
    expect(inputs.repoInput.value).toBe('saved/repo');
    expect(inputs.coderLabelInput.value).toBe('savedLabel');
  });

  it('applies overrides directly in loadSettings', () => {
    const inputs = createInputs();
    inputs.tokenInput.value = 'keep-me';
    const overrides = {
      repo: 'locked/repo',
      dri: 'DRI:@lock',
      coderBodyFlag: 'bodyFlag',
      coderLabelFlag: 'labelFlag',
      handle: '@locked',
      hasUseLabels: true,
      useLabels: true
    };
    loadSettings(inputs, overrides);
    expect(inputs.repoInput.value).toBe('locked/repo');
    expect(inputs.driInput.value).toBe('DRI:@lock');
    expect(inputs.coderBodyInput.value).toBe('bodyFlag');
    expect(inputs.coderLabelInput.value).toBe('labelFlag');
    expect(inputs.handleInput.value).toBe('@locked');
    expect(inputs.tokenInput.value).toBe('keep-me');
    expect(inputs.useLabelsInput.checked).toBe(true);
  });

  it('loads saved token when present', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'stored' }));
    const inputs = createInputs();
    loadSettings(inputs, {});
    expect(inputs.tokenInput.value).toBe('stored');
  });

  it('handles missing toggle input', () => {
    const inputs = createInputs();
    delete inputs.useLabelsInput;
    loadSettings(inputs, {});
    expect(inputs.repoInput.value).toBe(DEFAULTS.repo);
  });

  it('saves with locked overrides and null prior data', () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    const inputs = createInputs();
    delete inputs.useLabelsInput;
    const overrides = {
      hasRepo: true,
      hasDri: true,
      hasCoderBodyFlag: true,
      hasCoderLabelFlag: true,
      hasHandle: true
    };
    saveSettings(inputs, overrides);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.repo).toBeUndefined();
    expect(inputs.repoInput.value).toBe(DEFAULTS.repo);
    expect(inputs.driInput.value).toBe(DEFAULTS.dri);
    expect(inputs.coderBodyInput.value).toBe(DEFAULTS.coderBodyFlag);
    expect(inputs.coderLabelInput.value).toBe(DEFAULTS.coderLabelFlag);
    expect(inputs.handleInput.value).toBe(DEFAULTS.handle);
  });
});
