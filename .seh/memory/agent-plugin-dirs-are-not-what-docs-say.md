---
type: learning
---

# Agent plugin directories had to be verified by execution, not docs

Two of the five plugin targets contradicted the obvious reading of the docs:

- **Claude Code** loads drop-in plugins from `~/.claude/skills/<name>/`, the
  same directory as skills — found via `claude plugin init --help` ("auto-loads
  next session as `<name>@skills-dir`") and confirmed with `claude plugin list`
  reporting a seh symlink as loaded. This is why a package may not declare a
  skill and a plugin under one name.
- **pi** resolves a *symlinked directory* itself: `package.json` `pi.extensions`
  first, then `index.ts` / `index.js` (`dist/core/extensions/loader.js`,
  `resolveExtensionEntries`). So the pi adapter points at the plugin root, not
  into a `pi-extension/` subdirectory. The published discovery table lists only
  `*.ts`, but the loader accepts `.js` too, and a bare `extensions/` directory is
  *not* resolved at this level.

Re-verify these against the vendor CLI (or its loader source) before changing
`src/plugin-adapters.ts`; the docs alone would have produced links that never
load.
