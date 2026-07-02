# se-harness

Portable AI coding harness generator for Claude, Agents, and other tools.

## Usage

The `seh` CLI manages a modular AI coding harness across three layers:

- **L0 — Core** (bundled): universal principles and base content.
- **L1 — Global** (`~/.seh/`): authored once per developer; optional tool symlinks.
- **L2 — Project** (`.seh/` + `AGENTS.md` index): per-repository context.

### Overview

**AGENTS.md** is an **index** that links to modular content in `.seh/`:
- **Global modules** (from `~/.seh/global/`): security, preferences.
- **Domain modules** (`.seh/domain/`): architecture, glossary.
- **Stack modules** (`.seh/stack/`): technology-specific guides (e.g., `typescript.md`, `python.md`).
- **Project metadata** (`.seh/project.md`): purpose and goals.

**Generated files must NOT be hand-edited.** Edit `.seh/` source files and run `seh sync` to regenerate.

### Commands

#### 1. Global initialization

Set up the host-level harness at `~/.seh/`:

```bash
seh init --global
```

This creates:
- `~/.seh/AGENTS.md` — global index
- `~/.seh/global/security.md` — secure coding practices
- `~/.seh/global/preferences.md` — your personal coding preferences (editor, style, workflows)

Optionally, create symlinks for tools:

```bash
seh link --tool claude --target ~/.config/claude
```

#### 2. Project initialization

In your project directory, create the `.seh/` structure and choose technologies:

```bash
seh init --tech typescript,python
```

This creates:
- `AGENTS.md` — project index (links to global + project modules)
- `.seh/project.md` — project purpose and goals
- `.seh/domain/architecture.md` — system design and structure
- `.seh/domain/glossary.md` — domain terms and concepts
- `.seh/stack/typescript.md` — TypeScript setup and conventions
- `.seh/stack/python.md` — Python setup and conventions
- `seh.lock` — provenance metadata

**Supported technologies:** `javascript`, `typescript`, `python`, `go`, `c`, `rust`, `java`

After initialization, edit the `.seh/*.md` files to describe your project.

#### 3. Sync: Regenerate index

After editing `.seh/` sources, regenerate the index:

```bash
seh sync
```

This rewrites `AGENTS.md` and updates `seh.lock`. The index remains portable (no absolute paths).

#### 4. Check: Detect drift

Verify that `AGENTS.md` and `seh.lock` are in sync with `.seh/` sources:

```bash
seh check
```

Exits with code 0 if no drift; code 1 if files are stale or missing. Run `seh sync` to fix drift.

#### 5. Link: Create tool symlinks

Create symlinks from tool directories to `AGENTS.md`:

```bash
seh link --tool claude --target ~/.config/claude
seh link --tool claude --target .  # create CLAUDE.md symlink in current dir
```

Supported tools: `claude` (creates `CLAUDE.md` symlink).

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
