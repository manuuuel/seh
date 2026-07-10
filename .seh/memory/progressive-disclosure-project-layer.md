---
type: decision
---

# Progressive disclosure for the project layer

The project layer (`<repo>/.seh/AGENTS.md`) is a short directive index with
when-to-read cues pointing at focused modules under `.seh/` — loaded on
demand, not all at once. The global layer (`~/.seh/AGENTS.md`) is the
opposite: one fully-inlined document, since global guardrails should
always be loaded, not conditionally read.
