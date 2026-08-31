---
type: decision
---

# Plugin wiring is detected, never configured per plugin

`seh package install --plugins` decides where a plugin goes by probing each
agent's *own* manifest convention inside the plugin directory
(`.claude-plugin/plugin.json`, `gemini-extension.json`, `package.json`
`pi.extensions`, an `.opencode/` plugin file, `.agents/plugins/marketplace.json`).
The table lives in `src/plugin-adapters.ts`, one row per agent.

This keeps the feature generic: any plugin that follows a host's published
convention is wired, without seh knowing that plugin exists. Ponytail was the
worked example, not the specification.

An agent whose marker is absent is **skipped and reported**, never symlinked —
a link an agent cannot load is worse than no link, because it fails silently.
`harness.json` `paths` overrides detection for one agent when a plugin keeps its
adapter somewhere unconventional; it is an escape hatch, not the mechanism.
