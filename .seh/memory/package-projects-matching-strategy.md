---
type: problem
---

# Should package project overlays match by exact dirname or alias?

Harness packages support per-repo overlays under `projects/<name>/`. It's
unresolved whether `<name>` matching against a repo should require an
exact match to the repo's directory name, or support a configurable alias
in `harness.json` (so a package author can map multiple clone locations,
or a renamed local directory, to the same overlay). No decision made yet;
revisit when a real multi-repo package in the wild needs it.
