---
type: decision
---

# Skill routing has three mutually exclusive modes

A skill's `invoke` field in `harness.json` is exactly one of `always`
(every response), `when` (a described condition), or `optional` (agent
decides). This is rendered into a `## Skills` section in `AGENTS.md` by
`seh sync`, grouped by mode, so agents always know which skills to invoke
and when — without needing to infer intent from prose.
