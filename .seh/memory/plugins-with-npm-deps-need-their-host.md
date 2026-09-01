---
type: decision
---

# Plugins with npm dependencies are delegated, not installed

A symlink shares files, not `node_modules/`. A plugin whose loaded code declares
runtime `dependencies` therefore cannot be wired into an agent that loads it as a
module (pi's `index.ts`, an OpenCode `.mjs`): the first `import` fails on every
session, which is worse than not installing it at all.

`seh` holds the plugin back and prints the host's own install command — the
reference URL when there is one (`pi install https://github.com/...`), since a
plugin distributed from git may not exist on npm.

**The check follows entrypoints, not the repository.** `needsHostInstall` takes
the files the agent will load (pi's `pi.extensions`, else root `index.{ts,js}`;
OpenCode's plugin file) and sums `dependencies` from every `package.json` from
that file's directory up to the plugin root. A whole-tree scan was tried first
and was wrong in both directions: it missed a workspace monorepo's inner
packages until it recursed, and once recursive it wrongly held back ponytail,
whose bundled `ponytail-mcp/` has dependencies that pi never loads. The hold
clears once `node_modules/` exists, so a vendored plugin links normally.

`seh` does **not** run `npm install` itself, and this is deliberate: npm ≥7
installs `peerDependencies` too (verified — a package.json with only
`peerDependencies` still plans to add them). For a pi package that means
downloading duplicate copies of `@earendil-works/pi-*` and `typebox`, which pi's
packaging rules explicitly forbid because pi provides them. Dependency
resolution belongs to the host: `pi install npm:pi-web-access` puts the package
under `~/.pi/agent/npm/` with real `node_modules` and loads clean.

Running the host's installer *for* the user would be the next step up; it would
be the first time `seh` executes another tool's binary, so it needs its own ADR.
