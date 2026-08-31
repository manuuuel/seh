# Plugin portability for the harness

Status: approved (2026-08-31)

## Problem

A harness package already carries the global ruleset, project templates and
**skills** between machines. Agent **plugins** — the vendor-native runtime units
(Claude Code plugins, Gemini CLI extensions, pi extensions, OpenCode plugins) —
have no home in the package. Reproducing a workstation therefore means
re-installing every plugin by hand, once per agent, from memory.

`ponytail` is the shape of the artifact: one repository that ships thin
per-agent adapters. It is an *example*, not the target — the feature must work
for any plugin installable on a supported agent.

## Goal

`git clone my-harness && seh package use . && seh package install --plugins`
wires every plugin the package declares into every agent on the machine that the
plugin actually supports.

## Non-goals

- Producing plugin adapters *from* a harness (the export direction).
- Mutating agent config files (`settings.json`, `opencode.json`) — symlinks only.
- Shelling out to agent CLIs. seh writes files; agents need not be installed.
- Project-layer plugins. Like skills, plugins are a global-layer concern.

## Design

### Layer model — identical to skills

```
<package>/plugins/<name>/     source (vendored or referenced)
        v symlink
~/.seh/plugins/<name>/        stable intermediate on this machine
        v symlinks
~/.claude/skills/<n>/   ~/.gemini/extensions/<n>/   ~/.pi/agent/extensions/<n>/
~/.config/opencode/plugins/<n>.<ext>   ~/.agents/plugins/<n>/
```

`~/.seh/plugins/` is the stable indirection: the package can move without
breaking agent links.

### Adapter detection

Wiring is generic because it keys off each agent's *own* manifest convention,
never off a particular plugin. `src/plugin-adapters.ts` holds one row per agent:

```ts
type PluginAdapter = {
  agent: string;
  targetDir: (home: string) => string;
  detect: (pluginRoot: string) => string | null; // subpath, or null = no adapter
};
```

| agent | targetDir | detect | evidence |
|---|---|---|---|
| claude | `~/.claude/skills/` | `.claude-plugin/plugin.json` -> `.` | `claude plugin validate <dir>` resolves that path (executed) |
| gemini | `~/.gemini/extensions/` | `gemini-extension.json` -> `.` | gemini-cli `docs/extensions/reference.md:107` |
| pi | `~/.pi/agent/extensions/` | `package.json` with a resolvable `pi.extensions` entry, else `index.{ts,js}` -> `.` | pi `dist/core/extensions/loader.js` `resolveExtensionEntries` (read during build; it resolves a symlinked dir itself, so the adapter is the plugin root) |
| opencode | `~/.config/opencode/plugins/` | `package.json.main` under `.opencode/`; else the single file in `.opencode/plugin(s)/` | opencode.ai/docs/plugins |
| agents | `~/.agents/plugins/` | `.agents/plugins/marketplace.json` -> `.` | cross-agent interoperability path |

`detect` returning `null` means the plugin ships no adapter for that agent: seh
skips it and reports the skip. No symlink is created that could never load.

codex and copilot are **excluded** until a drop-in plugin directory can be
verified for them; adding one is a single row.

Link name = plugin name, plus the subpath's extension when it has one:
`.` -> `ponytail`, `pi-extension` -> `ponytail`,
`.opencode/plugins/ponytail.mjs` -> `ponytail.mjs`.

`harness.json` may override detection per agent — the escape hatch for an
unconventional layout, not the mechanism:

```json
"plugins": {
  "ponytail": {
    "type": "reference",
    "source": "https://github.com/DietrichGebert/ponytail",
    "ref": "main",
    "paths": { "pi": "pi-extension" }
  }
}
```

Plugins carry no `invoke` routing: they are loaded by the agent at runtime, so
nothing is rendered into `AGENTS.md`.

### Commands

| command | behavior |
|---|---|
| `seh plugins add <url> --vendor` | clone into `<package>/plugins/<n>/`, committed to the package repo |
| `seh plugins add <url> --reference [--ref b]` | record source in `harness.json`, gitignore `plugins/<n>/`, fetch at install |
| `seh plugins update [name]` | re-fetch referenced plugins |
| `seh plugins list` | type, source, on-disk state, and detected agent coverage |
| `seh package install --plugins` | fetch references, link into `~/.seh/plugins/`, fan out to detected agents |
| `seh package install --all` | harness + skills + plugins |
| `seh package init` / `status` | scaffold and report `plugins/` |

`--agents <list>` scopes the fan-out; the effective set is
`selected agents INTERSECT detected adapters`.

### Shared unit engine

`skills` and `plugins` are both git-backed units. The clone/vendor/reference/
update/gitignore logic moves to `src/units.ts` (kind-parameterized), removing
the `copyDir` duplication that already exists between `commands/skills.ts` and
`commands/install.ts`. The extraction is behavior-preserving: it lands in its own
commit and no existing test may be modified.

### Collision guard

Claude loads plugins from its skills directory, so a package declaring a skill
and a plugin under the same name would have them overwrite each other. Install
fails loudly with both names instead.

## Testing

- `test/plugin-adapters.test.ts` — per-agent detection, null cases, overrides, link naming.
- `test/plugins.test.ts` — add (vendor/reference), update, list, force/duplicate errors.
- `test/install.test.ts` — `--plugins` fan-out, skipped agents, `--all`, collision guard.
- `test/package.test.ts` — `plugins/` scaffolded and reported.
- Existing `test/skills.test.ts` and `test/install.test.ts` pass unmodified through the extraction.

## Risks

- **Ecosystem drift** — plugin conventions change. Contained to one table with
  one row per agent, each row citing its source.
- **Editing working skills code** — guarded by the unmodified-tests rule above.
- **pi's `.js` discovery** — resolved during the build: pi's loader accepts
  `.js` and resolves a symlinked directory through `package.json` `pi.extensions`
  or `index.{ts,js}`. Recorded in `.seh/memory/agent-plugin-dirs-are-not-what-docs-say.md`.

## Verification (2026-08-31)

Against a throwaway `HOME`, with the real `DietrichGebert/ponytail` repo:
`seh plugins add --reference` + `seh package install --plugins` linked claude,
gemini, pi, opencode and agents, and reported `codex` skipped. `claude plugin
list` reported `ponytail@skills-dir … Status: ✔ loaded`. A second, unrelated
plugin (`gemini-cli-extensions/security`) wired into gemini only, proving the
detection is not ponytail-shaped.
