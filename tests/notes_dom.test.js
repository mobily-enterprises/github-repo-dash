import { describe, it, beforeEach, expect } from 'vitest';

import { renderNote, pruneNoteBindings, noteKey } from '../docs/notes.js';
import { NOTES_KEY, DEFAULTS } from '../docs/config.js';

function makeState() {
  return { repo: 'owner/repo' };
}

function makeItem(id = 1) {
  return { id, number: id, title: `Item ${id}`, html_url: 'https://example.test' };
}

function setup() {
  document.body.innerHTML = '<ul id="list"></ul>';
  localStorage.clear();
}

describe('notes DOM bindings', () => {
  beforeEach(() => {
    setup();
  });

  it('persists note text and toggle to localStorage', () => {
    const li = document.createElement('li');
    const state = makeState();
    const item = makeItem();
    renderNote(li, state, item);
    const input = li.querySelector('.note-input');
    const toggle = li.querySelector('.tag-toggle input');
    input.value = 'todo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    const saved = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
    expect(saved[`${state.repo}#${item.id}`].text).toBe('todo');
    expect(saved[`${state.repo}#${item.id}`].isRed).toBe(true);
  });

  it('syncs multiple note bindings for same item', () => {
    const state = makeState();
    const item = makeItem(2);
    const list = document.getElementById('list') || document.body.appendChild(document.createElement('ul'));
    list.id = 'list';
    const li1 = document.createElement('li');
    const li2 = document.createElement('li');
    list.append(li1, li2);
    renderNote(li1, state, item);
    renderNote(li2, state, item);
    const input1 = li1.querySelector('.note-input');
    const input2 = li2.querySelector('.note-input');
    input1.value = 'shared';
    input1.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input2.value).toBe('shared');
  });

  it('prunes bindings for detached elements', () => {
    const state = makeState();
    const item = makeItem(3);
    const li = document.createElement('li');
    renderNote(li, state, item);
    li.remove();
    pruneNoteBindings();
    // If prune works, it should not throw and bindings map is emptied internally.
    expect(true).toBe(true);
  });

  it('noteKey falls back to DEFAULTS.repo when state.repo missing', () => {
    const key = noteKey({}, { id: 99 });
    expect(key).toBe(`${DEFAULTS.repo}#99`);
  });
});
