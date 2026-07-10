---
type: learning
---

# Classic branch protection's enforce_admins is all-or-nothing

Setting `enforce_admins: false` on GitHub's classic branch protection
lets admins bypass *every* rule in that protection — including "changes
must be made through a pull request" and the force-push/deletion blocks —
not just the required-approving-review-count, which was the only rule this
project intended admins to bypass. This was discovered by testing with a
real direct push to `main`, which unexpectedly succeeded
("Bypassed rule violations").

Fix: use a repository ruleset instead of classic branch protection, with
`bypass_actors: [{ actor_type: "RepositoryRole", actor_id: 5, bypass_mode:
"pull_request" }]`. `bypass_mode: "pull_request"` scopes the bypass to
PR-merge time only — a direct push is still rejected
(`GH013: Repository rule violations`), while merging your own PR without a
second reviewer still works. Verified both directions with real pushes
before trusting the config.
