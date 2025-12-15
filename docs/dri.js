import { DEFAULTS } from './config.js';
import { ensureAt, escapeRegExp } from './utils.js';

export function extractDri(item, opts = {}) {
  const driToken = opts.driToken || DEFAULTS.dri;
  const coderBodyFlag = opts.coderBodyFlag || DEFAULTS.coderBodyFlag;
  const coderLabelFlag = opts.coderLabelFlag || DEFAULTS.coderLabelFlag;
  const useBodyText = typeof opts.useBodyText === 'boolean' ? opts.useBodyText : DEFAULTS.useBodyText;
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

  const handle = ensureAt(match?.[1]);
  if (!match) return { handle, role: 'review' };

  const author = (item?.user?.login || '').toLowerCase();
  const handleBare = handle.replace(/^@+/, '').toLowerCase();

  let role = 'review';
  if (handle !== 'not found') {
    const driTokenEsc = escapeRegExp(driToken);
    const handleBareEsc = escapeRegExp(handleBare);
    const coderFromAuthor = author && handleBare && author === handleBare;
    const coderFromBody =
      useBodyText &&
      coderBodyFlag &&
      item?.body &&
      new RegExp(`${driTokenEsc}\\s*@?${handleBareEsc}\\s+${escapeRegExp(coderBodyFlag)}`, 'i').test(item.body);
    let coderFromLabel = false;
    if (coderLabelFlag && Array.isArray(item?.labels)) {
      coderFromLabel = item.labels.some((label) => {
        const name = label?.name || '';
        if (!name) return false;
        return new RegExp(escapeRegExp(coderLabelFlag), 'i').test(name);
      });
    }
    if (coderFromAuthor || coderFromBody || coderFromLabel) role = 'code';
  }

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
    if (driRole === 'code') action = 'pls code';
    else if (driRole === 'review') action = 'pls review';
  }

  return `Assignee: ${label}${suffix}${action ? ` (${action})` : ''}`;
}
