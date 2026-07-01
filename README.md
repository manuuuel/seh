# se-harness

Portable AI coding harness generator for Claude, Agents, and other tools.

## Usage (v1)

The `seh` CLI manages your project's AI coding harness — a set of context files (`.harness/`) that generate tool-specific entrypoints (`CLAUDE.md`, `AGENTS.md`, etc.).

### Global initialization

Set up the host-level global harness at `~/.se-harness`:

```bash
seh init --global
```

This creates:
- `~/.se-harness/preferences.md` — your personal coding preferences (editor, style, workflows)
- `~/.se-harness/config.json` — default adapter settings

### Project initialization

In your project directory, create the `.harness/` structure:

```bash
seh init
```

This creates:
- `.harness/project.md` — project purpose and goals
- `.harness/architecture.md` — system design and structure
- `.harness/stack.md` — technologies and dependencies
- `.harness/conventions.md` — code style and patterns

After initialization, edit the `.harness/*.md` files to describe your project.

### Sync: Generate tool entrypoints

After editing `.harness/` sources, regenerate the tool-specific files:

```bash
seh sync
```

This writes:
- `CLAUDE.md` — context for Claude Code
- `AGENTS.md` — context for the Agents framework
- `harness.lock` — provenance metadata

**Important:** Generated files (`CLAUDE.md`, `AGENTS.md`) must **NOT** be hand-edited. They are automatically composed from:
1. Global layer (L0): `~/.se-harness/preferences.md`
2. Project layer (L1): `.harness/*.md`
3. Local layer (L2): reserved for future use

To make changes, edit the `.harness/` source files and re-run `seh sync`.

### Check: Detect drift

Verify that generated files are in sync with `.harness/` sources:

```bash
seh check
```

Exits with code 0 if no drift; code 1 if files are stale or missing. Run `seh sync` to fix drift.

### Custom adapters

By default, `seh sync` and `seh check` generate `CLAUDE.md` and `AGENTS.md`. To use a different set:

```bash
seh sync --adapters claude
seh check --adapters claude,agents
```

## Installation

```bash
npm install -g se-harness
```

Or use locally in a project:

```bash
npm install --save-dev se-harness
npx seh init
npx seh sync
```

## Development

```bash
npm install
npm run build    # compile to dist/
npm test         # run test suite
npm run dev      # run CLI via tsx without building
```

## License

MIT
