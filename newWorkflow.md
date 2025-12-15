# Workflow (labels-first)

Use the DRI/assignee dashboard to keep track of work: https://mobily-enterprises.github.io/github-repo-dash/

## Issues
- **Needs triage**: New issues stay unlabelled and unassigned so triagers can take them cleanly.
- **Being triaged**: Assign yourself while you investigate or ask clarifying questions; hold labels until scope is understood.
- **Triaged**: Add the right labels (bug/feature/area/etc.). Remove yourself if you’re handing it off; keep yourself assigned if you’ll own it.

## Pull requests

We identify DRI via labels (DRI:@handle). Each PR should have exactly one assignee while in progress; brand-new and ready-for-merge PRs are unassigned.

- **To be picked up**: New PRs are unassigned and have no DRI label.
- **Being worked on**: PRs have a DRI label and one assignee (the current blocker).
- **Ready for merge**: DRI sets `ready_for_merge` and clears the assignee after review.

PR lifecycle
- Collaborators picking up a PR add the DRI label for themselves and set themselves as the only assignee.
- Review thoroughly; after review, hand the assignee back to the author while they address feedback.
- When the author updates, the DRI reassigns to themselves to re-review.
- If the author goes MIA, mark `op_mia`, then either close or take over (or ask another collaborator) while keeping the DRI label accurate.
- Once satisfied, add `ready_for_merge` and clear the assignee. Maintainers merge; if something’s wrong they remove the label and reassign to the DRI.

If the author is MIA and collaborators lack push rights, the DRI either closes and opens a new PR referencing it, or gives it up.

## Note on DRI's role

- The DRI is usually the reviewer/steward while the author codes.
- If the DRI is also the PR author, they are the coder by definition.
- If the author goes `op_mia`, the DRI becomes the coder for the PR (or finds another coder) rather than acting as reviewer.

## Links

Prefer the dashboard above for live queries; it shows the same states and is easier to use.
