# Project — se-harness (`seh`)
<!-- Extends the global rules in ~/.seh/AGENTS.md; never contradicts them. -->

## Mission
`seh` is a portable, tool-agnostic generator for AI coding-agent context files.
It produces **one source of truth** per layer and fans it out — via symlinks —
to every tool's real context path, so the same guidance auto-loads in pi, Codex,
Gemini CLI, GitHub Copilot, OpenCode, and Claude Code. No vendor lock-in, no
hand-maintained per-tool copies.

- **Global layer** (`~/.seh/AGENTS.md`): one self-contained, fully-inlined
  ruleset, symlinked into each tool's global path.
- **Project layer** (`<repo>/.seh/AGENTS.md`): a progressive-disclosure index —
  a directive preamble plus focused modules linked with when-to-read cues,
  symlinked to each tool's project path.

## Constraints
- **TypeScript, ESM only.** Every local import uses a `.js` specifier.
- **Runtime deps are minimal and deliberate:** `commander`, `prompts`. Do not
  add runtime dependencies without escalating.
- **Node ≥ 18.**
- **Symlink-only wiring.** Never fall back to copying a canonical file into a
  tool path; on symlink failure, fail loudly with an actionable message.
- **Generated files must not be hand-edited.** Edit `.seh/` sources (and the
  bundled `assets/`) and run `seh sync`. `seh check` must stay green (CI/pre-commit).
- **Canonical vs. generated:** `<repo>/.seh/AGENTS.md` is canonical and
  committed; the root tool files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `.github/copilot-instructions.md`) are **generated symlinks**, gitignored, and
  regenerated per-developer by `seh sync`.
- **TDD.** Every behavior change lands with a test; keep test output pristine.

## Out of scope
- Not a linter, formatter, or CI platform.
- Not model/prompt tuning.
- No generic-fallback technology stack — only the named stacks in
  `SUPPORTED_TECHS` are generated (extend the catalog to add more).
- Not self-contained-per-repo: the global layer lives on the host, not vendored
  into every repository.

## Common commands
- `npm run build` — bundle to `dist/` (tsup, single-file ESM CLI).
- `npm test` — full Vitest suite (must be green before commit).
- `npm run dev -- <args>` — run the CLI from source via tsx.
- `npm run try` — full flow against a throwaway `HOME` (real `~` untouched).
