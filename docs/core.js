import { DEFAULTS, REPO_REGEX } from './config.js';
import { normalizeHandle, isValidRepo } from './utils.js';

// Build GitHub search query from config template and current state.
export function buildQuery(cfg, state) {
  const replacement = state.useLabels ? (token) => `in:body "${token}"` : (token) => `label:"${token}"`;
  const query = cfg.query
    .replace(/__DRI_HANDLE__/g, replacement(`${state.driToken}${state.handleBare}`))
    .replace(/__HANDLE__/g, state.handle)
    .replace(/__HANDLE_BARE__/g, state.handleBare)
    .replace(/__DRI__/g, replacement(state.driToken))
    .trim();
  if (!state.repo) return query;
  return `repo:${state.repo} ${query}`;
}

// Read query params that may override inputs (and lock them).
export function getQueryOverrides() {
  const params = new URLSearchParams(window.location.search);
  const rawRepo = params.get('repo');
  const rawDri = params.get('dri_token');
  const rawHandle = params.get('handle');
  const rawCoderBody = params.get('coder_body_flag');
  const rawCoderLabel = params.get('coder_label_flag');
  const rawUseLabels = params.get('use_labels');

  const repo = rawRepo && rawRepo.trim() ? rawRepo.trim() : '';
  const dri = rawDri && rawDri.trim() ? rawDri.trim() : '';
  const handle = rawHandle && rawHandle.trim() ? normalizeHandle(rawHandle, DEFAULTS.handle) : '';
  const coderBodyFlag = rawCoderBody && rawCoderBody.trim() ? rawCoderBody.trim() : '';
  const coderLabelFlag = rawCoderLabel && rawCoderLabel.trim() ? rawCoderLabel.trim() : '';
  const useLabels =
    rawUseLabels !== null
      ? ['1', 'true', 'yes', 'on'].includes(rawUseLabels.trim().toLowerCase())
      : null;

  return {
    repo,
    dri,
    handle,
    coderBodyFlag,
    coderLabelFlag,
    useLabels,
    hasRepo: !!repo,
    hasDri: !!dri,
    hasHandle: !!handle,
    hasCoderBodyFlag: !!coderBodyFlag,
    hasCoderLabelFlag: !!coderLabelFlag,
    hasUseLabels: useLabels !== null
  };
}

export { isValidRepo, REPO_REGEX };
