---
type: decision
---

# Memory is just files

`.seh/memory/<name>.md`, committed to the repo — no generation, no hooks,
no external dependencies. `seh sync` surfaces them in `AGENTS.md`'s
`## Memory` section; agents are instructed by the harness protocol to write
memory at session end. Humans or agents update them directly when things
change. This keeps the system inspectable and diffable in plain git, with
no moving parts beyond markdown files.
