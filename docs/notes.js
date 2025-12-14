import { DEFAULTS } from './config.js';
import { createEl } from './utils.js';
import { getNotesStore, setNotesStore, persistNotes } from './storage.js';

const noteBindings = new Map();

export function noteKey(state, item) {
  return `${state.repo || DEFAULTS.repo}#${item.id}`;
}

function getNoteEntry(key) {
  const store = getNotesStore();
  return store[key] || { text: '', isRed: false };
}

function registerNoteBinding(key, binding) {
  if (!noteBindings.has(key)) noteBindings.set(key, new Set());
  noteBindings.get(key).add(binding);
}

function applyNoteState(binding, entry) {
  binding.input.value = entry.text || '';
  binding.toggle.checked = !!entry.isRed;
  binding.wrapper.classList.toggle('is-red', !!entry.isRed);
}

function syncNoteMirrors(key, entry, origin) {
  const bindings = noteBindings.get(key);
  if (!bindings) return;
  bindings.forEach((binding) => {
    if (!binding.wrapper?.isConnected) {
      bindings.delete(binding);
      return;
    }
    if (binding === origin) return;
    applyNoteState(binding, entry);
  });
  if (bindings.size === 0) noteBindings.delete(key);
}

function updateNote(key, entry, origin) {
  const store = { ...getNotesStore(), [key]: entry };
  setNotesStore(store);
  persistNotes();
  syncNoteMirrors(key, entry, origin);
}

export function renderNote(li, state, item) {
  const key = noteKey(state, item);
  const entry = getNoteEntry(key);
  const wrapper = createEl('div', 'note');

  const row = createEl('div', 'note-row');
  const input = createEl('input', 'note-input');
  input.type = 'text';
  input.maxLength = 120;
  input.placeholder = 'Short note (saved locally)';

  const toggle = createEl('label', 'tag-toggle');
  const toggleInput = createEl('input');
  toggleInput.type = 'checkbox';
  toggle.title = 'Mark important';
  toggle.append(toggleInput, createEl('span', null, '!'));

  const binding = { input, toggle: toggleInput, wrapper };
  applyNoteState(binding, entry);
  registerNoteBinding(key, binding);

  const persist = () => {
    const next = { text: input.value, isRed: toggleInput.checked };
    applyNoteState(binding, next);
    updateNote(key, next, binding);
  };

  input.addEventListener('input', persist);
  toggleInput.addEventListener('change', persist);

  row.append(input, toggle);
  wrapper.append(row);
  li.appendChild(wrapper);
}

export function pruneNoteBindings() {
  noteBindings.forEach((bindings, key) => {
    bindings.forEach((binding) => {
      if (!binding.wrapper?.isConnected) bindings.delete(binding);
    });
    if (bindings.size === 0) noteBindings.delete(key);
  });
}
