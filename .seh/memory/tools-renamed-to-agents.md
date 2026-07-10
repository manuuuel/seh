---
type: decision
---

# `--tools` renamed to `--agents`

CLI flags and internals were renamed from `--tools`/`linkTool`/
`SUPPORTED_TOOLS` to `--agents`/`linkAgent`/`SUPPORTED_AGENTS`. "Agent" is
the more accurate term for what seh targets (Claude Code, Codex, Gemini
CLI, etc. are AI coding agents, not generic developer tools). If you find
old issues, PRs, or forks referencing `--tools`, this is why — and it's why
`scripts/try.sh` broke once before being fixed: any code or docs still
using the old names are stale.
