import { DEFAULTS } from './config.js';
import { ensureAt, escapeRegExp } from './utils.js';

const normalizeDriOpts = (opts = {}) => ({
  driToken: opts.driToken || DEFAULTS.dri,
  coderBodyFlag: opts.coderBodyFlag || DEFAULTS.coderBodyFlag,
  coderLabelFlag: opts.coderLabelFlag || DEFAULTS.coderLabelFlag,
  useBodyText: typeof opts.useBodyText === 'boolean' ? opts.useBodyText : DEFAULTS.useBodyText
});

const findDriMatch = (item, { driToken, useBodyText }) => {
  const regex = new RegExp(`${escapeRegExp(driToken)}\\s*([^\\s]+)`, 'i');
  let match = null;

  if (useBodyText && item?.body) {
    const bodyMatch = item.body.match(regex);
    if (bodyMatch) match = bodyMatch;
  }

  if (!match && Array.isArray(item?.labels)) {
    for (const label of item.labels) {
      if (!label?.name) continue;
      const labelMatch = label.name.match(regex);
      if (labelMatch) {
        match = labelMatch;
        break;
      }
    }
  }

  return match;
};

const hasCoderLabelFlag = (item, coderLabelFlag) => {
  if (!coderLabelFlag || !Array.isArray(item?.labels)) return false;
  const labelRegex = new RegExp(escapeRegExp(coderLabelFlag), 'i');
  return item.labels.some((label) => {
    const name = label?.name || '';
    if (!name) return false;
    return labelRegex.test(name);
  });
};

const hasCoderBodyFlag = (item, { driToken, coderBodyFlag }) => {
  if (!coderBodyFlag || !item?.body) return false;
  const match = item.body.match(new RegExp(`${escapeRegExp(driToken)}\\s*([^\\s]+)`, 'i'));
  const handle = ensureAt(match?.[1]);
  if (handle === 'not found') return false;
  const handleBare = handle.replace(/^@+/, '');
  if (!handleBare) return false;
  const driTokenEsc = escapeRegExp(driToken);
  const handleBareEsc = escapeRegExp(handleBare);
  return new RegExp(`${driTokenEsc}\\s*@?${handleBareEsc}\\s+${escapeRegExp(coderBodyFlag)}`, 'i').test(item.body);
};

const isAuthorMia = (item, opts = {}) => {
  const { driToken, coderBodyFlag, coderLabelFlag, useBodyText } = normalizeDriOpts(opts);
  const fromLabel = hasCoderLabelFlag(item, coderLabelFlag);
  const fromBody = useBodyText ? hasCoderBodyFlag(item, { driToken, coderBodyFlag }) : false;
  return fromLabel || fromBody;
};

export function extractDri(item, opts = {}) {
  const normalized = normalizeDriOpts(opts);
  const match = findDriMatch(item, normalized);

  const handle = ensureAt(match?.[1]);
  if (!match) return { handle, role: 'review' };

  const author = (item?.user?.login || '').toLowerCase();
  const handleBare = handle.replace(/^@+/, '').toLowerCase();

  const coderFromAuthor = author && handleBare && author === handleBare;
  const authorMia = isAuthorMia(item, normalized);
  const role = handle !== 'not found' && (authorMia || coderFromAuthor) ? 'code' : 'review';

  return { handle, role };
}

export function formatDri(dri, youHandle) {
  if (!dri || dri.handle === 'not found') return null;
  const roleLabel = dri.role === 'code' ? 'coder' : 'reviewer';
  const prettyHandle = youHandle && dri.handle.toLowerCase() === youHandle.toLowerCase() ? 'you' : dri.handle;
  return `DRI (${roleLabel}): ${prettyHandle}`;
}

export function extractAssignee(item) {
  const assignees = item.assignees || [];
  return assignees[0]?.login ? ensureAt(assignees[0].login) : 'unassigned';
}

export function resolveCoderHandle(item, dri, opts = {}) {
  const normalized = normalizeDriOpts(opts);
  const author = ensureAt(item?.user?.login);
  if (isAuthorMia(item, normalized)) {
    const handle = dri?.handle;
    return handle && handle !== 'not found' ? handle : 'not found';
  }
  return author;
}

export function formatAssignee(item, dri, state, opts = {}) {
  const { includeActionForYou = false } = opts;
  const assignee = extractAssignee(item);
  if (assignee === 'unassigned') return 'Assignee: unassigned';

  const assigneeBare = assignee.replace(/^@+/, '').toLowerCase();
  const author = (item?.user?.login || '').toLowerCase();
  const driHandle = (dri?.handle || '').replace(/^@+/, '').toLowerCase();
  const driRole = dri?.role;

  let suffix = '';
  if (driHandle && driRole === 'code') {
    if (assigneeBare && assigneeBare !== driHandle) suffix = ' (reviewing)';
  } else if (driHandle && driRole === 'review') {
    if (assigneeBare && assigneeBare === author && author && author !== driHandle) suffix = ' (coding)';
  }

  const youHandle = (state?.handle || '').toLowerCase();
  const isYou = youHandle && assignee.toLowerCase() === youHandle;
  const label = isYou ? 'you' : assignee;

  let action = '';
  if (includeActionForYou && isYou) {
    const coderHandle = resolveCoderHandle(item, dri, state);
    const coderBare = coderHandle && coderHandle !== 'not found' ? coderHandle.replace(/^@+/, '').toLowerCase() : '';
    if (coderBare && assigneeBare && coderBare === assigneeBare) action = 'pls code';
    else if (coderHandle !== 'not found') action = 'pls review';
  }

  return `Assignee: ${label}${suffix}${action ? ` (${action})` : ''}`;
}
