# Skill Routing Design

## Goal

Agents must know which skills to invoke and when — always, conditionally, or optionally.
Today skills are unstructured text in AGENTS.md; agents guess. This adds structured routing
that `seh sync` renders into every agent's context file.

## Scope

**In scope:**
- `--always`, `--when <condition>`, `--optional` flags on `seh skills add`
- `invoke` field in `harness.json` `SkillEntry`
- `seh sync` renders a `## Skills` section in AGENTS.md (both global and project)
- `seh skills list` shows the invoke mode alongside each skill

**Out of scope:**
- New commands — routing is managed through existing `seh skills add`
- Per-project override of package-level routing
- Runtime skill selection logic (agent handles that)

## Data Model

`SkillEntry` in `types.ts` gains an optional field:

```ts
invoke?:
  | { mode: 'always'; label?: string }
  | { mode: 'when'; condition: string }
  | { mode: 'optional'; label?: string }
```

Stored in `harness.json`:

```json
{
  "skills": {
    "brainstorming": { "type": "vendor", "invoke": { "mode": "always", "label": "before any implementation" } },
    "systematic-debugging": { "type": "vendor", "invoke": { "mode": "when", "condition": "bug / test failure / unexpected behavior" } },
    "xlsx": { "type": "vendor", "invoke": { "mode": "optional" } }
  }
}
```

## CLI Changes

`seh skills add <url>` gains three mutually exclusive flags:

| Flag | Stored as |
|------|-----------|
| `--always [label]` | `{ mode: 'always', label }` |
| `--when <condition>` | `{ mode: 'when', condition }` |
| `--optional` | `{ mode: 'optional' }` |

If no flag provided, `invoke` field is omitted (skill registered but no routing instruction).

`seh skills list` output gains an `invoke` column:

```
✓ brainstorming  [vendor]  always: before any implementation
✓ systematic-debugging  [vendor]  when: bug / test failure
✓ xlsx  [vendor]  optional
✓ tdd  [vendor]  (no routing)
```

## Rendered Output in AGENTS.md

`seh sync` appends a `## Skills` section after `## Contents`:

```markdown
## Skills

Always invoke:
- `brainstorming` — before any implementation
- `caveman` — every response

Invoke when:
- `systematic-debugging` — bug / test failure / unexpected behavior
- `tdd` — writing new feature

Optional:
- `xlsx` — spreadsheet work
```

Skills with no `invoke` field are omitted from this section.
Section is omitted entirely if no skills have routing configured.

## Affected Files

| File | Change |
|------|--------|
| `src/types.ts` | Add `invoke` to `SkillEntry` |
| `src/commands/skills.ts` | Pass `invoke` through in `runSkillsAdd` |
| `src/cli.ts` | Add `--always`, `--when`, `--optional` flags to `skills add`; update `skills list` output |
| `src/commands/sync.ts` | Read skills from resolver/harness.json, render `## Skills` section |
| `src/index-emitter.ts` | Add `buildSkillsSection(skills)` helper |

## Verification

- `seh skills add github:owner/repo --always "before any implementation"` → harness.json updated
- `seh skills list` → shows invoke mode
- `seh sync` → AGENTS.md contains `## Skills` section with correct entries
- Skills with no routing → not rendered in `## Skills`
- No routing configured at all → section omitted
