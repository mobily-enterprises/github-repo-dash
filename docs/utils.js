export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createEl = (tag, className, textContent) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof textContent === 'string') el.textContent = textContent;
  return el;
};

export const setListPlaceholder = (list, text, cls = 'empty') => {
  list.innerHTML = '';
  const li = createEl('li', cls, text);
  list.appendChild(li);
};

export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ensureAt = (handle) => {
  if (!handle) return 'not found';
  return handle.startsWith('@') ? handle : `@${handle}`;
};

export const normalizeHandle = (raw, fallback = '@me') => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

export const isValidRepo = (repo, regex) => !!repo && regex.test(repo.trim());
