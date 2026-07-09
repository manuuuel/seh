# Memory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.seh/memory/` typed markdown files, `seh memory add/list/remove` commands, and render a `## Memory` section in AGENTS.md on `seh sync`.

**Architecture:** Add `MemoryType` and `MemoryEntry` types to `types.ts`, path helpers to `paths.ts`, a `buildMemorySection` helper to `index-emitter.ts`, a `memory.ts` command module, and wire it all into `sync.ts` and `cli.ts` following exactly the same patterns used by skill routing.

**Tech Stack:** TypeScript, Node.js fs, Commander.js, Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/types.ts` | Add `MemoryType` union and `MemoryEntry` type |
| `src/paths.ts` | Add `projectMemoryDir`, `projectMemoryFile` helpers |
| `src/index-emitter.ts` | Add `buildMemorySection(entries)` helper |
| `src/commands/memory.ts` | New: `runMemoryAdd`, `runMemoryList`, `runMemoryRemove` |
| `src/commands/sync.ts` | Read `.seh/memory/` in `buildProjectIndex`, append `## Memory` |
| `src/cli.ts` | Register `seh memory add/list/remove` command group |
| `test/memory.test.ts` | New: unit tests for all three memory commands |
| `test/index-emitter.test.ts` | Add tests for `buildMemorySection` |
| `test/sync.test.ts` | Add tests for `## Memory` rendering in `buildProjectIndex` |

---

### Task 1: Types and path helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `src/paths.ts`
- Test: `test/paths.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/paths.test.ts` inside the existing describe block:

```ts
import { projectMemoryDir, projectMemoryFile } from '../src/paths.js';

it('projectMemoryDir returns .seh/memory under root', () => {
  expect(projectMemoryDir('/my/project')).toBe('/my/project/.seh/memory');
});

it('projectMemoryFile returns .seh/memory/<name>.md under root', () => {
  expect(projectMemoryFile('/my/project', 'auth-strategy')).toBe('/my/project/.seh/memory/auth-strategy.md');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/paths.test.ts 2>&1 | tail -10
```

Expected: FAIL — `projectMemoryDir` not exported.

- [ ] **Step 3: Add types to `src/types.ts`**

Append after the `HarnessPackage` type:

```ts
export type MemoryType = 'decision' | 'constraint' | 'learning' | 'problem';

export type MemoryEntry = {
  name: string;
  type: MemoryType;
  title: string;
  relPath: string;
};
```

- [ ] **Step 4: Add path helpers to `src/paths.ts`**

Append at the end of `src/paths.ts`:

```ts
export const projectMemoryDir = (root: string) => path.join(projectSehDir(root), 'memory');
export const projectMemoryFile = (root: string, name: string) => path.join(projectMemoryDir(root), `${name}.md`);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/paths.test.ts 2>&1 | tail -10
```

Expected: all paths tests PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/types.ts src/paths.ts test/paths.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(memory): add MemoryType, MemoryEntry types and path helpers"
```

---

### Task 2: `buildMemorySection` helper in `index-emitter.ts`

**Files:**
- Modify: `src/index-emitter.ts`
- Modify: `test/index-emitter.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `test/index-emitter.test.ts`:

```ts
import { buildMemorySection } from '../src/index-emitter.js';
import type { MemoryEntry } from '../src/types.js';

describe('buildMemorySection', () => {
  it('returns protocol block only when entries array is empty', () => {
    const out = buildMemorySection([]);
    expect(out).toContain('## Memory');
    expect(out).toContain('seh memory add');
    expect(out).not.toContain('### Decisions');
  });

  it('renders protocol block always', () => {
    const entries: MemoryEntry[] = [
      { name: 'auth', type: 'decision', title: 'Auth strategy', relPath: '.seh/memory/auth.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('**decision**');
    expect(out).toContain('**constraint**');
    expect(out).toContain('**learning**');
    expect(out).toContain('**problem**');
    expect(out).toContain('seh memory add <name>');
  });

  it('renders Decisions subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'auth', type: 'decision', title: 'Auth strategy', relPath: '.seh/memory/auth.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Decisions');
    expect(out).toContain('[Auth strategy](.seh/memory/auth.md)');
  });

  it('renders Constraints subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'url', type: 'constraint', title: 'URL structure', relPath: '.seh/memory/url.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Constraints');
    expect(out).toContain('[URL structure](.seh/memory/url.md)');
  });

  it('renders Learnings subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'jwt', type: 'learning', title: 'JWT expiry', relPath: '.seh/memory/jwt.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Learnings');
    expect(out).toContain('[JWT expiry](.seh/memory/jwt.md)');
  });

  it('renders Open problems subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'rate', type: 'problem', title: 'Rate limiting', relPath: '.seh/memory/rate.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).toContain('### Open problems');
    expect(out).toContain('[Rate limiting](.seh/memory/rate.md)');
  });

  it('renders all four subsections in order when all types present', () => {
    const entries: MemoryEntry[] = [
      { name: 'a', type: 'decision', title: 'D', relPath: '.seh/memory/a.md' },
      { name: 'b', type: 'constraint', title: 'C', relPath: '.seh/memory/b.md' },
      { name: 'c', type: 'learning', title: 'L', relPath: '.seh/memory/c.md' },
      { name: 'd', type: 'problem', title: 'P', relPath: '.seh/memory/d.md' },
    ];
    const out = buildMemorySection(entries);
    const dIdx = out.indexOf('### Decisions');
    const cIdx = out.indexOf('### Constraints');
    const lIdx = out.indexOf('### Learnings');
    const pIdx = out.indexOf('### Open problems');
    expect(dIdx).toBeLessThan(cIdx);
    expect(cIdx).toBeLessThan(lIdx);
    expect(lIdx).toBeLessThan(pIdx);
  });

  it('omits subsection when type has no entries', () => {
    const entries: MemoryEntry[] = [
      { name: 'a', type: 'decision', title: 'D', relPath: '.seh/memory/a.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out).not.toContain('### Constraints');
    expect(out).not.toContain('### Learnings');
    expect(out).not.toContain('### Open problems');
  });

  it('sorts entries alphabetically by title within each subsection', () => {
    const entries: MemoryEntry[] = [
      { name: 'z', type: 'decision', title: 'Zebra', relPath: '.seh/memory/z.md' },
      { name: 'a', type: 'decision', title: 'Apple', relPath: '.seh/memory/a.md' },
    ];
    const out = buildMemorySection(entries);
    expect(out.indexOf('Apple')).toBeLessThan(out.indexOf('Zebra'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/index-emitter.test.ts 2>&1 | tail -10
```

Expected: FAIL — `buildMemorySection` not exported.

- [ ] **Step 3: Implement `buildMemorySection` in `src/index-emitter.ts`**

Add import at top:

```ts
import type { MemoryEntry } from './types.js';
```

Append the function at the end of `src/index-emitter.ts`:

```ts
const MEMORY_PROTOCOL = `Write to \`.seh/memory/\` at end of every session:
- **decision** — a choice made and why (architecture, tech, approach)
- **constraint** — a hard rule discovered (never do X, always do Y)
- **learning** — something non-obvious that cost time to figure out
- **problem** — unresolved issue to pick up next session

Run: \`seh memory add <name> [--decision|--constraint|--learning|--problem]\``;

export function buildMemorySection(entries: MemoryEntry[]): string {
  const byType = (type: MemoryEntry['type']) =>
    entries
      .filter((e) => e.type === type)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((e) => `- [${e.title}](${e.relPath})`);

  const decisions = byType('decision');
  const constraints = byType('constraint');
  const learnings = byType('learning');
  const problems = byType('problem');

  const parts: string[] = ['## Memory', MEMORY_PROTOCOL];
  if (decisions.length > 0) parts.push(`### Decisions\n${decisions.join('\n')}`);
  if (constraints.length > 0) parts.push(`### Constraints\n${constraints.join('\n')}`);
  if (learnings.length > 0) parts.push(`### Learnings\n${learnings.join('\n')}`);
  if (problems.length > 0) parts.push(`### Open problems\n${problems.join('\n')}`);

  return parts.join('\n\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/index-emitter.test.ts 2>&1 | tail -10
```

Expected: all index-emitter tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/index-emitter.ts test/index-emitter.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(index-emitter): add buildMemorySection helper"
```

---

### Task 3: Memory command module (`runMemoryAdd`, `runMemoryList`, `runMemoryRemove`)

**Files:**
- Create: `src/commands/memory.ts`
- Create: `test/memory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/memory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMemoryAdd, runMemoryList, runMemoryRemove } from '../src/commands/memory.js';
import { projectMemoryDir, projectMemoryFile } from '../src/paths.js';

function tmpProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehmem-'));
  fs.mkdirSync(path.join(root, '.seh'), { recursive: true });
  return root;
}

describe('runMemoryAdd', () => {
  it('creates .seh/memory/<name>.md with decision frontmatter by default', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'auth-strategy' });
    const file = projectMemoryFile(root, 'auth-strategy');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    expect(content).toContain('type: decision');
  });

  it('creates file with specified type', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'rate-limiting', type: 'problem' });
    const content = fs.readFileSync(projectMemoryFile(root, 'rate-limiting'), 'utf8');
    expect(content).toContain('type: problem');
  });

  it('creates .seh/memory/ directory if missing', () => {
    const root = tmpProject();
    expect(fs.existsSync(projectMemoryDir(root))).toBe(false);
    runMemoryAdd({ root, name: 'test' });
    expect(fs.existsSync(projectMemoryDir(root))).toBe(true);
  });

  it('does not overwrite existing file', () => {
    const root = tmpProject();
    runMemoryAdd({ root, name: 'auth' });
    const before = fs.readFileSync(projectMemoryFile(root, 'auth'), 'utf8');
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '# Modified\n');
    runMemoryAdd({ root, name: 'auth' });
    const after = fs.readFileSync(projectMemoryFile(root, 'auth'), 'utf8');
    expect(after).toBe('# Modified\n');
  });

  it('returns the file path', () => {
    const root = tmpProject();
    const { filePath } = runMemoryAdd({ root, name: 'test' });
    expect(filePath).toBe(projectMemoryFile(root, 'test'));
  });
});

describe('runMemoryList', () => {
  it('returns empty array when memory dir missing', () => {
    const root = tmpProject();
    expect(runMemoryList({ root }).entries).toEqual([]);
  });

  it('returns empty array when memory dir empty', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    expect(runMemoryList({ root }).entries).toEqual([]);
  });

  it('reads entries from memory files', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '---\ntype: decision\n---\n\n# Auth strategy\n\nChose JWT.\n');
    const { entries } = runMemoryList({ root });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('auth');
    expect(entries[0].type).toBe('decision');
    expect(entries[0].title).toBe('Auth strategy');
    expect(entries[0].relPath).toBe('.seh/memory/auth.md');
  });

  it('ignores files with invalid or missing type', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'bad'), '# No frontmatter\n');
    const { entries } = runMemoryList({ root });
    expect(entries).toHaveLength(0);
  });

  it('sorts entries by title within each type', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'z'), '---\ntype: decision\n---\n\n# Zebra\n');
    fs.writeFileSync(projectMemoryFile(root, 'a'), '---\ntype: decision\n---\n\n# Apple\n');
    const { entries } = runMemoryList({ root });
    expect(entries[0].title).toBe('Apple');
    expect(entries[1].title).toBe('Zebra');
  });
});

describe('runMemoryRemove', () => {
  it('deletes the memory file', () => {
    const root = tmpProject();
    fs.mkdirSync(projectMemoryDir(root), { recursive: true });
    fs.writeFileSync(projectMemoryFile(root, 'auth'), '# X\n');
    runMemoryRemove({ root, name: 'auth' });
    expect(fs.existsSync(projectMemoryFile(root, 'auth'))).toBe(false);
  });

  it('throws when file does not exist', () => {
    const root = tmpProject();
    expect(() => runMemoryRemove({ root, name: 'nonexistent' }))
      .toThrow("Memory 'nonexistent' not found");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/memory.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/commands/memory.ts`**

Create `src/commands/memory.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { projectMemoryDir, projectMemoryFile } from '../paths.js';
import type { MemoryEntry, MemoryType } from '../types.js';

const VALID_TYPES: MemoryType[] = ['decision', 'constraint', 'learning', 'problem'];

function parseFrontmatter(content: string): MemoryType | null {
  const m = content.match(/^---\s*\ntype:\s*(\w+)\s*\n---/);
  if (!m) return null;
  const t = m[1] as MemoryType;
  return VALID_TYPES.includes(t) ? t : null;
}

function memoryTemplate(name: string, type: MemoryType): string {
  return `---\ntype: ${type}\n---\n\n# ${name}\n\n\n`;
}

export function runMemoryAdd(opts: {
  root: string;
  name: string;
  type?: MemoryType;
}): { filePath: string; created: boolean } {
  const type = opts.type ?? 'decision';
  const filePath = projectMemoryFile(opts.root, opts.name);
  if (fs.existsSync(filePath)) return { filePath, created: false };
  fs.mkdirSync(projectMemoryDir(opts.root), { recursive: true });
  fs.writeFileSync(filePath, memoryTemplate(opts.name, type));
  return { filePath, created: true };
}

export function runMemoryList(opts: {
  root: string;
}): { entries: MemoryEntry[] } {
  const dir = projectMemoryDir(opts.root);
  if (!fs.existsSync(dir)) return { entries: [] };

  const entries: MemoryEntry[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const type = parseFrontmatter(content);
    if (!type) continue;
    const name = f.replace(/\.md$/, '');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : name;
    entries.push({ name, type, title, relPath: `.seh/memory/${f}` });
  }

  return { entries: entries.sort((a, b) => a.title.localeCompare(b.title)) };
}

export function runMemoryRemove(opts: {
  root: string;
  name: string;
}): void {
  const filePath = projectMemoryFile(opts.root, opts.name);
  if (!fs.existsSync(filePath)) throw new Error(`Memory '${opts.name}' not found`);
  fs.rmSync(filePath);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/memory.test.ts 2>&1 | tail -10
```

Expected: all memory tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/commands/memory.ts test/memory.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(memory): add runMemoryAdd, runMemoryList, runMemoryRemove commands"
```

---

### Task 4: Wire `## Memory` section into `seh sync`

**Files:**
- Modify: `src/commands/sync.ts`
- Modify: `test/sync.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `test/sync.test.ts` (import `runMemoryAdd` at top if not present):

```ts
import { runMemoryAdd } from '../src/commands/memory.js';
import { projectMemoryDir } from '../src/paths.js';

describe('runSync memory section', () => {
  it('appends ## Memory section when .seh/memory/ has entries', () => {
    const r = repoWithProject();
    fs.mkdirSync(path.join(r, '.seh', 'memory'), { recursive: true });
    fs.writeFileSync(
      path.join(r, '.seh', 'memory', 'auth.md'),
      '---\ntype: decision\n---\n\n# Auth strategy\n\nChose JWT.\n',
    );
    runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
    const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
    expect(idx).toContain('## Memory');
    expect(idx).toContain('seh memory add');
    expect(idx).toContain('### Decisions');
    expect(idx).toContain('[Auth strategy](.seh/memory/auth.md)');
  });

  it('renders only protocol block when memory dir exists but is empty', () => {
    const r = repoWithProject();
    fs.mkdirSync(path.join(r, '.seh', 'memory'), { recursive: true });
    runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
    const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
    expect(idx).toContain('## Memory');
    expect(idx).toContain('seh memory add');
    expect(idx).not.toContain('### Decisions');
  });

  it('omits ## Memory section when memory dir does not exist', () => {
    const r = repoWithProject();
    runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
    const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
    expect(idx).not.toContain('## Memory');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/sync.test.ts 2>&1 | tail -10
```

Expected: FAIL — `## Memory` not found.

- [ ] **Step 3: Update `buildProjectIndex` in `src/commands/sync.ts`**

Add imports at top of `sync.ts`:

```ts
import { buildIndex, buildSkillsSection, buildMemorySection, type IndexEntry, titleOf } from '../index-emitter.js';
import type { LockFile, SkillEntry, MemoryEntry } from '../types.js';
import { runMemoryList } from './memory.js';
```

Update `buildProjectIndex` signature and body — add the memory section after skills:

```ts
export function buildProjectIndex(
  root: string,
  technologies: string[],
  skills: Record<string, SkillEntry> = {},
  memoryEntries: MemoryEntry[] | null = null,
): string {
  const sehDir = projectSehDir(root);
  const entries: IndexEntry[] = [];
  const projectMd = path.join(sehDir, 'project.md');
  if (fs.existsSync(projectMd)) {
    entries.push({ title: titleOf(fs.readFileSync(projectMd, 'utf8')), relPath: '.seh/project.md', cue: moduleCue('.seh/project.md') });
  }
  const domainDir = path.join(sehDir, 'domain');
  if (fs.existsSync(domainDir)) {
    for (const f of fs.readdirSync(domainDir).filter((x) => x.endsWith('.md')).sort()) {
      const rel = `.seh/domain/${f}`;
      const content = fs.readFileSync(path.join(domainDir, f), 'utf8');
      entries.push({ title: titleOf(content), relPath: rel, cue: moduleCue(rel) });
    }
  }
  for (const tech of technologies) {
    entries.push({ title: titleOf(stackModule(tech)), relPath: `.seh/stack/${tech}.md`, cue: stackCue(tech) });
  }

  let result = buildIndex(projectPreamble(), entries);

  const skillsSection = buildSkillsSection(skills);
  if (skillsSection) result = result.trimEnd() + '\n\n' + skillsSection + '\n';

  if (memoryEntries !== null) {
    result = result.trimEnd() + '\n\n' + buildMemorySection(memoryEntries) + '\n';
  }

  return result;
}
```

Update `runSync` to read memory and pass to `buildProjectIndex`:

```ts
const memoryDir = path.join(projectSehDir(opts.root), 'memory');
const memoryEntries = fs.existsSync(memoryDir)
  ? runMemoryList({ root: opts.root }).entries
  : null;
const skills = opts.resolver ? opts.resolver.skills() : {};
fs.writeFileSync(
  projectCanonicalIndex(opts.root),
  buildProjectIndex(opts.root, opts.technologies, skills, memoryEntries),
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/sync.test.ts 2>&1 | tail -10
```

Expected: all sync tests PASS.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test 2>&1 | tail -10
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/commands/sync.ts test/sync.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(sync): append ## Memory section from .seh/memory/ in AGENTS.md"
```

---

### Task 5: Register `seh memory` command group in CLI

**Files:**
- Modify: `src/cli.ts`
- Modify: `test/cli.test.ts`

- [ ] **Step 1: Write the failing test**

Read `test/cli.test.ts` to understand the existing command-registration test pattern, then add:

```ts
describe('seh memory commands registered', () => {
  it('registers memory add, list, remove subcommands', () => {
    const prog = buildProgram();
    const memoryCmd = prog.commands.find((c) => c.name() === 'memory');
    expect(memoryCmd).toBeDefined();
    const sub = memoryCmd!.commands.map((c) => c.name());
    expect(sub).toContain('add');
    expect(sub).toContain('list');
    expect(sub).toContain('remove');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/cli.test.ts 2>&1 | tail -10
```

Expected: FAIL — `memory` command not found.

- [ ] **Step 3: Add `seh memory` command group to `src/cli.ts`**

Add import at top of `cli.ts`:

```ts
import { runMemoryAdd, runMemoryList, runMemoryRemove } from './commands/memory.js';
```

Add the command group before the `return program;` line:

```ts
const memory = program.command('memory').description('Manage project memory files in .seh/memory/');

memory
  .command('add <name>')
  .description('Create a memory file (default type: decision)')
  .option('--decision', 'record a decision made and why')
  .option('--constraint', 'record a hard rule discovered')
  .option('--learning', 'record something non-obvious that cost time')
  .option('--problem', 'record an unresolved issue for next session')
  .action((name: string, opts: { decision?: boolean; constraint?: boolean; learning?: boolean; problem?: boolean }) => {
    try {
      import type { MemoryType } from './types.js';
      let type: MemoryType = 'decision';
      if (opts.constraint) type = 'constraint';
      else if (opts.learning) type = 'learning';
      else if (opts.problem) type = 'problem';
      const { filePath, created } = runMemoryAdd({ root: process.cwd(), name, type });
      if (!created) {
        console.log(`seh: memory '${name}' already exists at ${filePath}`);
      } else {
        const editor = process.env['EDITOR'];
        if (editor) {
          const { spawnSync } = await import('node:child_process');
          spawnSync(editor, [filePath], { stdio: 'inherit' });
        } else {
          console.log(`seh: created ${filePath}`);
        }
      }
    } catch (err) { fail(err); }
  });

memory
  .command('list')
  .description('List memory files grouped by type')
  .action(() => {
    try {
      const { entries } = runMemoryList({ root: process.cwd() });
      if (entries.length === 0) { console.log('seh: no memory files'); return; }
      const byType = (type: string) => entries.filter((e) => e.type === type);
      const print = (label: string, type: string) => {
        const es = byType(type);
        if (es.length === 0) return;
        console.log(`\n${label}`);
        for (const e of es) console.log(`  ${e.name}  ${e.title}`);
      };
      print('Decisions', 'decision');
      print('Constraints', 'constraint');
      print('Learnings', 'learning');
      print('Open problems', 'problem');
    } catch (err) { fail(err); }
  });

memory
  .command('remove <name>')
  .description('Delete a memory file')
  .action((name: string) => {
    try {
      runMemoryRemove({ root: process.cwd(), name });
      console.log(`seh: removed memory '${name}'`);
    } catch (err) { fail(err); }
  });
```

**Note:** The `memory add` action uses a dynamic `import type` inside the function — move the `MemoryType` import to the top-level imports instead. Also the `spawnSync` import should be a static top-level import. Fix during implementation:

Replace the inline `import type { MemoryType }` with a top-level import:
```ts
import type { MemoryType } from './types.js';
```

Replace the `await import('node:child_process')` with a top-level import:
```ts
import { spawnSync } from 'node:child_process';
```

The action becomes synchronous (no `async`).

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/cli.test.ts 2>&1 | tail -10
```

Expected: all CLI tests PASS.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test 2>&1 | tail -10
```

Expected: all tests PASS.

- [ ] **Step 6: Build to verify TypeScript**

```bash
cd /home/manuuuel/pocs/seh && npm run build 2>&1 | tail -5
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/cli.ts test/cli.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(cli): register seh memory add/list/remove commands"
```
