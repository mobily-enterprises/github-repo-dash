import { DEFAULTS, REPO_REGEX } from './config.js';
import { normalizeHandle, isValidRepo } from './utils.js';

function escapeLabelValue(label) {
  return label.replace(/"/g, '\\"');
}

// Build GitHub search query from config template and current state.
export function buildQuery(cfg, state, opts = {}) {
  const useBodySource = !!state.useBodyText;
  const rawDriLabels = Array.isArray(opts.driLabels) ? opts.driLabels : [];
  const template =
    (useBodySource && cfg.queryUsingBodyText) ||
    (!useBodySource && cfg.queryUsingLabels) ||
    (useBodySource ? cfg.queryUsingLabels : cfg.queryUsingBodyText) ||
    '';

  const usingLabelsTemplate = template === cfg.queryUsingLabels;
  const ownDriLabel = `${state.driToken || ''}${state.handleBare || ''}`.toLowerCase();
  const driLabels = rawDriLabels.filter((label) => typeof label === 'string');
  const labelsForQuery =
    cfg.excludeOwnDriLabel && usingLabelsTemplate
      ? driLabels.filter((label) => label.toLowerCase() !== ownDriLabel)
      : driLabels;

  const driLabelsOr =
    labelsForQuery.length === 0
      ? 'label:"__none__"'
      : `label:${labelsForQuery.map((label) => `"${escapeLabelValue(label)}"`).join(',')}`;
  const driLabelsNot =
    labelsForQuery.length === 0
      ? ''
      : labelsForQuery.map((label) => `-label:"${escapeLabelValue(label)}"`).join(' ');

  const query = template
    .replace(/__DRI_LABELS_OR__/g, driLabelsOr)
    .replace(/__DRI_LABELS_NOT__/g, driLabelsNot)
    .replace(/__DRI_HANDLE__/g, `${state.driToken}${state.handleBare}`)
    .replace(/__HANDLE__/g, state.handle)
    .replace(/__HANDLE_BARE__/g, state.handleBare)
    .replace(/__DRI__/g, state.driToken)
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
  const rawUseBodyText = params.get('use_body_text');

  const repo = rawRepo && rawRepo.trim() ? rawRepo.trim() : '';
  const dri = rawDri && rawDri.trim() ? rawDri.trim() : '';
  const handle = rawHandle && rawHandle.trim() ? normalizeHandle(rawHandle, DEFAULTS.handle) : '';
  const coderBodyFlag = rawCoderBody && rawCoderBody.trim() ? rawCoderBody.trim() : '';
  const coderLabelFlag = rawCoderLabel && rawCoderLabel.trim() ? rawCoderLabel.trim() : '';
  const useBodyText =
    rawUseBodyText !== null
      ? ['1', 'true', 'yes', 'on'].includes(rawUseBodyText.trim().toLowerCase())
      : null;

  return {
    repo,
    dri,
    handle,
    coderBodyFlag,
    coderLabelFlag,
    useBodyText,
    hasRepo: !!repo,
    hasDri: !!dri,
    hasHandle: !!handle,
    hasCoderBodyFlag: !!coderBodyFlag,
    hasCoderLabelFlag: !!coderLabelFlag,
    hasUseBodyText: useBodyText !== null
  };
}

export { isValidRepo, REPO_REGEX };
