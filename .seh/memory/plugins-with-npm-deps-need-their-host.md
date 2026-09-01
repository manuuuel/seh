---
type: decision
---

# Plugins with npm dependencies are delegated, not installed

A symlink shares files, not `node_modules/`. A plugin declaring runtime
`dependencies` therefore cannot be wired into an agent that loads it as a module
(pi's `index.ts`, an OpenCode `.mjs`): the first `import` fails on every session,
which is worse than not installing it at all.

`seh` refuses to link those adapters and prints the host's own install command
(`pi install npm:<name>`). Manifest-based adapters of the same plugin (Claude
`plugin.json`, Gemini extension manifest) are still linked — only module
entrypoints are held back. `needsHostInstall` clears once `node_modules/` exists,
so a vendored or manually installed plugin links normally.

`seh` does **not** run `npm install` itself, and this is deliberate: npm ≥7
installs `peerDependencies` too (verified — a package.json with only
`peerDependencies` still plans to add them). For a pi package that means
downloading duplicate copies of `@earendil-works/pi-*` and `typebox`, which pi's
packaging rules explicitly forbid because pi provides them. Dependency
resolution belongs to the host: `pi install npm:pi-web-access` puts the package
under `~/.pi/agent/npm/` with real `node_modules` and loads clean.

Running the host's installer *for* the user would be the next step up; it would
be the first time `seh` executes another tool's binary, so it needs its own ADR.
