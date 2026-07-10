---
type: decision
---

# Symlinks, not copies

Canonical files (`~/.seh/AGENTS.md` globally, `<repo>/.seh/AGENTS.md` per
project) are symlinked into every tool's real config path — never copied.
This guarantees zero per-tool drift: there is exactly one real file per
layer, and every tool-specific path (`CLAUDE.md`, `GEMINI.md`, etc.) is a
pointer to it. On symlink failure, `seh` fails loudly with an actionable
message rather than falling back to a copy.
