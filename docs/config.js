export const config = [
  {
    id: 'issues-unlabeled',
    section: 'issues',
    label: 'Untriaged',
    title: 'Open issues without labels',
    desc: 'Zero labels attached. Likely need triage.',
    queryUsingLabels: 'is:issue is:open no:label',
    queryUsingBodyText: 'is:issue is:open no:label'
  },
  {
    id: 'issues-assigned',
    section: 'issues',
    label: 'In Progress',
    title: 'Open issues with an assignee',
    desc: 'Issues that are currently owned.',
    queryUsingLabels: 'is:issue is:open assignee:*',
    queryUsingBodyText: 'is:issue is:open assignee:*'
  },
  {
    id: 'issues-mine',
    section: 'issues',
    label: 'Mine',
    title: 'Open issues assigned to you',
    desc: 'Issues where you are the assignee.',
    queryUsingLabels: 'is:issue is:open assignee:__HANDLE_BARE__',
    queryUsingBodyText: 'is:issue is:open assignee:__HANDLE_BARE__'
  },
  {
    id: 'prs-mine',
    section: 'pulls',
    label: 'Blocking',
    title: 'PRs assigned to you',
    desc: 'You are blocking these PRs as assignee.',
    queryUsingLabels: 'is:pr is:open assignee:__HANDLE_BARE__',
    queryUsingBodyText: 'is:pr is:open assignee:__HANDLE_BARE__'
  },
  {
    id: 'prs-dri-waiting',
    section: 'pulls',
    label: 'DRI waiting',
    title: 'PRs: you are DRI, not assignee',
    desc: 'You are DRI, not assigned: waiting on others.',
    queryUsingLabels: 'is:pr is:open label:"__DRI_HANDLE__" -assignee:__HANDLE_BARE__',
    queryUsingBodyText: 'is:pr is:open in:body "__DRI_HANDLE__" -assignee:__HANDLE_BARE__'
  },
  {
    id: 'prs-dri-me',
    section: 'pulls',
    label: 'DRI: You',
    title: 'PRs: you are DRI',
    desc: 'PR body lists you as DRI.',
    queryUsingLabels: 'is:pr is:open label:"__DRI_HANDLE__"',
    queryUsingBodyText: 'is:pr is:open in:body "__DRI_HANDLE__"'
  },
  {
    id: 'prs-dri-waiting-assignee',
    section: 'triage',
    grid: 'triagePriority',
    label: 'WAITING',
    tone: 'warn',
    title: 'PRs with DRI but no assignee',
    desc: 'DRI declared in body but nobody is assigned. Assign the work.',
    queryUsingLabels: 'is:pr is:open __DRI_LABELS_OR__ no:assignee',
    queryUsingBodyText: 'is:pr is:open in:body "__DRI__" no:assignee'
  },
  {
    id: 'prs-no-dri',
    section: 'triage',
    label: 'Unowned',
    tone: 'warn',
    title: 'Open PRs with no DRI',
    desc: 'PR body does not declare a DRI. Unowned.',
    queryUsingLabels: 'is:pr is:open __DRI_LABELS_NOT__',
    queryUsingBodyText: 'is:pr is:open NOT in:body "__DRI__"',
  },
  {
    id: 'prs-with-dri',
    section: 'triage',
    label: 'Owned',
    title: 'Open PRs with a DRI',
    desc: 'PR body includes a DRI tag.',
    queryUsingLabels: 'is:pr is:open __DRI_LABELS_OR__',
    queryUsingBodyText: 'is:pr is:open in:body "__DRI__"'
  },
  {
    id: 'prs-assignee-no-dri',
    section: 'triage',
    label: 'Needs DRI',
    tone: 'error',
    title: 'PRs with assignee but no DRI',
    desc: 'Assigned but missing a DRI. Likely erroneous.',
    queryUsingLabels: 'is:pr is:open assignee:* __DRI_LABELS_NOT__',
    queryUsingBodyText: 'is:pr is:open assignee:* NOT in:body "__DRI__"'
  }
];

export const TOP_META_DRI_IDS = new Set(['prs-with-dri', 'prs-mine', 'prs-dri-waiting-assignee', 'prs-dri-me', 'prs-dri-waiting']);
export const YOUR_ROLE_IDS = new Set(['prs-dri-me', 'prs-dri-waiting']);
export const TOP_META_ASSIGNEE_IDS = new Set([
  'prs-with-dri',
  'prs-no-dri',
  'prs-dri-me',
  'prs-dri-waiting',
  'prs-dri-waiting-assignee',
  'prs-assignee-no-dri'
]);

export const DEFAULTS = {
  repo: '',
  dri: 'DRI:@',
  handle: '@me',
  token: '',
  coderBodyFlag: 'coder',
  coderLabelFlag: 'op_mia',
  useBodyText: false
};

export const SEARCH_DELAY_MS = 5000;
export const NO_TOKEN_DELAY_MS = 10000;
export const STORAGE_KEY = `knexRepoDashSettings:${window.location.origin}${window.location.pathname}${window.location.hash}`;
export const NOTES_KEY = `${STORAGE_KEY}:notes`;
export const CARDS_CACHE_KEY = `${STORAGE_KEY}:cardsCache`;
export const DRI_LABELS_CACHE_KEY = `${STORAGE_KEY}:driLabels`;
export const REPO_REGEX = /^[^/\s]+\/[^/\s]+$/;
export const CARDS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const DRI_LABELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
