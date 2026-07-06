# Skills Distribution + `--agents` Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `--tools`/`SUPPORTED_TOOLS`/`linkTool` to `--agents`/`SUPPORTED_AGENTS`/`linkAgent` across the CLI, then add `seh skills add|update|list` and `seh package install` commands for distributing skills from a harness package.

**Architecture:** The rename is purely mechanical — no logic changes, only identifier names. Skills build on the existing package layer: `<package>/skills/<name>/` → (symlink) `~/.seh/skills/<name>/` → (symlink) `~/.claude/skills/<name>/`. A new `SKILL_TARGETS` map in `links.ts` controls per-agent skill destinations. `seh skills add` vendors (git clone) or references (harness.json entry) a skill. `seh package install --skills` fetches references and wires symlinks.

**Tech Stack:** TypeScript, Node.js `fs`, `child_process.execSync`, Commander, Prompts, Vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/types.ts` — `GlobalConfig.tools` → `agents`; add `SkillEntry` |
| Modify | `src/links.ts` — rename all exports; add `readGlobalConfig`, `SKILL_TARGETS`, `linkSkill` |
| Modify | `src/package-resolver.ts` — use `readGlobalConfig` |
| Modify | `src/commands/link.ts` — use renamed imports; `tools` → `agents` in return type |
| Modify | `src/commands/sync.ts` — `projectTools` → `projectAgents`; renamed imports |
| Modify | `src/commands/initGlobal.ts` — `tools` param → `agents` |
| Modify | `src/commands/package.ts` — `tools: []` → `agents: []` in JSON writes |
| Modify | `src/commands/initProject.ts` — `projectTools` → `projectAgents` |
| Modify | `src/cli.ts` — `--tools` → `--agents`; renamed imports |
| Modify | `src/paths.ts` — add skill path helpers |
| Create | `src/commands/skills.ts` — `runSkillsAdd`, `runSkillsUpdate`, `runSkillsList` |
| Create | `src/commands/install.ts` — `runPackageInstall` |
| Modify | `src/commands/package.ts` — `runPackageInit` creates `skills/` dir |
| Modify | `test/links.test.ts` — renamed imports and config keys |
| Modify | `test/link.test.ts` — renamed imports, `tools` → `agents` in assertions |
| Modify | `test/e2e.test.ts` — renamed imports and params |
| Modify | `test/initGlobal.test.ts` — `tools:` → `agents:` |
| Modify | `test/package.test.ts` — `tools:` → `agents:` |
| Modify | `test/package-resolver.test.ts` — `tools:` → `agents:` |
| Modify | `test/sync.test.ts` — `projectTools` → `projectAgents` |
| Create | `test/skills.test.ts` |
| Create | `test/install.test.ts` |

---

## Task 1: Complete `--agents` rename

**Files:** `src/types.ts`, `src/links.ts`, `src/package-resolver.ts`, `src/commands/link.ts`, `src/commands/sync.ts`, `src/commands/initGlobal.ts`, `src/commands/package.ts`, `src/commands/initProject.ts`, `src/cli.ts`, and all affected test files.

- [ ] **Step 1: Update `src/types.ts`**

Replace the entire file content:

```typescript
export type LockFile = {
  version: string;
  technologies: string[];
  generatedAt: string;
};

export type GlobalConfig = {
  agents: string[];
  packagePath?: string;
};

export type SkillEntry =
  | { type: 'vendor' }
  | { type: 'reference'; source: string; ref: string };

export type HarnessPackage = {
  name: string;
  version: string;
  description?: string;
  modelTag?: string;
  skills?: Record<string, SkillEntry>;
};
```

- [ ] **Step 2: Replace `src/links.ts` with the new version**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import {
  globalIndexFile, projectCanonicalIndex, globalConfigFile,
  claudeGlobalFile, codexGlobalFile, piGlobalFile, geminiGlobalFile, opencodeGlobalFile, copilotGlobalFile,
  projectIndexFile, projectClaudeFile, projectGeminiFile, projectCopilotFile,
} from './paths.js';
import type { GlobalConfig } from './types.js';

export type Layer = 'global' | 'project';

export const SUPPORTED_AGENTS = ['claude', 'codex', 'pi', 'gemini', 'opencode', 'copilot'] as const;

const GLOBAL_TARGETS: Record<string, (base: string) => string> = {
  claude: claudeGlobalFile,
  codex: codexGlobalFile,
  pi: piGlobalFile,
  gemini: geminiGlobalFile,
  opencode: opencodeGlobalFile,
  copilot: copilotGlobalFile,
};

const PROJECT_TARGETS: Record<string, (base: string) => string> = {
  claude: projectClaudeFile,
  codex: projectIndexFile,
  pi: projectIndexFile,
  opencode: projectIndexFile,
  gemini: projectGeminiFile,
  copilot: projectCopilotFile,
};

function targetFor(layer: Layer, agent: string, base: string): string | undefined {
  const map = layer === 'global' ? GLOBAL_TARGETS : PROJECT_TARGETS;
  const fn = map[agent];
  return fn ? fn(base) : undefined;
}

function sourceFor(layer: Layer, base: string): string {
  return layer === 'global' ? globalIndexFile(base) : projectCanonicalIndex(base);
}

export function linkAgent(layer: Layer, agent: string, base: string): void {
  const target = targetFor(layer, agent, base);
  if (!target) return;
  const source = sourceFor(layer, base);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const rel = path.relative(path.dirname(target), source);
  if (fs.lstatSync(target, { throwIfNoEntry: false })) fs.rmSync(target, { force: true });
  try {
    fs.symlinkSync(rel, target);
  } catch (err) {
    throw new Error(
      `Cannot create symlink ${target} -> ${source}: ${err instanceof Error ? err.message : String(err)}. ` +
      `On Windows, enable Developer Mode or run in an elevated shell.`,
    );
  }
}

export function unlinkAgent(layer: Layer, agent: string, base: string): void {
  const target = targetFor(layer, agent, base);
  if (!target) return;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat && stat.isSymbolicLink()) fs.rmSync(target, { force: true });
}

export function isLinked(layer: Layer, agent: string, base: string): boolean {
  const target = targetFor(layer, agent, base);
  if (!target) return false;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat || !stat.isSymbolicLink()) return false;
  try {
    return fs.realpathSync(target) === fs.realpathSync(sourceFor(layer, base));
  } catch {
    return false;
  }
}

export function readGlobalConfig(home: string): GlobalConfig {
  const p = globalConfigFile(home);
  if (!fs.existsSync(p)) return { agents: [] };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    throw new Error(`Malformed config.json: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Migration: tools → agents
  if (Array.isArray(raw['tools']) && !raw['agents']) {
    raw['agents'] = raw['tools'];
    delete raw['tools'];
    fs.writeFileSync(p, JSON.stringify(raw, null, 2) + '\n');
  }
  return {
    agents: Array.isArray(raw['agents']) ? (raw['agents'] as string[]) : [],
    packagePath: typeof raw['packagePath'] === 'string' ? raw['packagePath'] : undefined,
  };
}

export function readConfiguredAgents(home: string): string[] {
  try {
    return readGlobalConfig(home).agents;
  } catch {
    return [];
  }
}

export const SKILL_TARGETS: Record<string, (home: string, skillName: string) => string> = {
  claude: (home, name) => path.join(home, '.claude', 'skills', name),
};

export function linkSkill(agentName: string, skillName: string, home: string, sehSkillPath: string): void {
  const targetFn = SKILL_TARGETS[agentName];
  if (!targetFn) return;
  const target = targetFn(home, skillName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.lstatSync(target, { throwIfNoEntry: false })) fs.rmSync(target, { force: true });
  const rel = path.relative(path.dirname(target), sehSkillPath);
  try {
    fs.symlinkSync(rel, target);
  } catch (err) {
    throw new Error(`Cannot create symlink ${target}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
```

- [ ] **Step 3: Update `src/package-resolver.ts` — use `readGlobalConfig`**

Remove the `import type { GlobalConfig }` line and the manual JSON parsing in `readResolver`. Replace `readResolver` with:

```typescript
import { readGlobalConfig } from './links.js';

export function readResolver(home: string = os.homedir()): PackageResolver {
  try {
    const cfg = readGlobalConfig(home);
    return new PackageResolver(cfg.packagePath ?? null);
  } catch {
    return new PackageResolver(null);
  }
}
```

Also remove `globalConfigFile` from the imports of `package-resolver.ts` (now handled by `readGlobalConfig`).

- [ ] **Step 4: Update `src/commands/link.ts`**

Replace the entire file:

```typescript
import fs from 'node:fs';
import { globalConfigFile } from '../paths.js';
import { linkAgent, unlinkAgent, SUPPORTED_AGENTS, readGlobalConfig } from '../links.js';

export function runLink(opts: {
  home: string;
  add?: string[];
  remove?: string[];
}): { linked: string[]; unlinked: string[]; agents: string[] } {
  const known = SUPPORTED_AGENTS as readonly string[];
  for (const a of [...(opts.add ?? []), ...(opts.remove ?? [])]) {
    if (!known.includes(a)) throw new Error(`Unknown agent: ${a}`);
  }

  const cfgPath = globalConfigFile(opts.home);
  const cfg = readGlobalConfig(opts.home);
  const set = new Set<string>(cfg.agents);

  const linked: string[] = [];
  const unlinked: string[] = [];
  for (const a of opts.add ?? []) { linkAgent('global', a, opts.home); set.add(a); linked.push(a); }
  for (const a of opts.remove ?? []) { unlinkAgent('global', a, opts.home); set.delete(a); unlinked.push(a); }

  const agents = [...set].sort();
  fs.writeFileSync(cfgPath, JSON.stringify({ ...cfg, agents }, null, 2) + '\n');
  return { linked, unlinked, agents };
}
```

- [ ] **Step 5: Update `src/commands/sync.ts`**

Change imports: `linkTool` → `linkAgent`, `readConfiguredTools` → `readConfiguredAgents`, `SUPPORTED_TOOLS` → `SUPPORTED_AGENTS`.

Change `opts` type: `projectTools?: string[]` → `projectAgents?: string[]`.

Replace the tools section at the bottom of `runSync`:

```typescript
  const agents = (opts.projectAgents ?? readConfiguredAgents(opts.home ?? os.homedir()))
    .filter((a) => (SUPPORTED_AGENTS as readonly string[]).includes(a));
  if (agents.length > 0) {
    for (const a of agents) linkAgent('project', a, opts.root);
    ensureGitignore(opts.root);
  }
```

- [ ] **Step 6: Update `src/commands/initGlobal.ts`**

Change import: `linkTool` is not imported here, but the opts use `tools`. Update:
- `tools?: string[]` → `agents?: string[]` in the opts type
- `JSON.stringify({ tools: opts.tools ?? [] })` → `JSON.stringify({ agents: opts.agents ?? [] })`

- [ ] **Step 7: Update `src/commands/package.ts`**

In `runPackageInit`: change `JSON.stringify({ tools: [] })` → `JSON.stringify({ agents: [] })`.

In `runPackageUse`: it calls `readGlobalConfig` (already imported via the new `links.ts` — add the import). Change the config read from manual parsing to using `readGlobalConfig`, and write back with `agents`:

```typescript
import { readGlobalConfig } from '../links.js';

// In runPackageUse:
  const cfg = readGlobalConfig(home);
  cfg.packagePath = resolved;
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n');
```

- [ ] **Step 8: Update `src/commands/initProject.ts`**

Change `projectTools?: string[]` → `projectAgents?: string[]` in opts type.

Pass `projectAgents: opts.projectAgents` to `runSync` (replacing `projectTools`).

- [ ] **Step 9: Update `src/cli.ts`**

Change imports: `SUPPORTED_TOOLS` → `SUPPORTED_AGENTS`, `linkTool` → `linkAgent`, `readConfiguredTools` → `readConfiguredAgents`.

Change CLI option: `.option('--tools <list>', 'comma-separated tools to symlink (global, non-interactive)')` → `.option('--agents <list>', 'comma-separated agents to symlink (global, non-interactive)')`.

In the global init action:
- `opts.tools` → `opts.agents`
- `res.tools` → `res.agents` (variable name)
- `linkAgent('global', t, os.homedir())` (was `linkTool`)
- Console log: `tools [...]` → `agents [...]`
- `SUPPORTED_AGENTS` in choices
- `res.agents` (from prompts)

In the project init action:
- `readConfiguredAgents(os.homedir())` (was `readConfiguredTools`)
- `projectAgents:` (was `projectTools:`)

- [ ] **Step 10: Update test files**

**`test/links.test.ts`:** Replace entire file:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { linkAgent, unlinkAgent, isLinked, SUPPORTED_AGENTS, readConfiguredAgents } from '../src/links.js';
import { globalDir, globalIndexFile, projectSehDir, projectCanonicalIndex,
  codexGlobalFile, projectCopilotFile, projectIndexFile } from '../src/paths.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlk-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  return h;
}
function tmpRepo() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehrp-'));
  fs.mkdirSync(projectSehDir(r), { recursive: true });
  fs.writeFileSync(projectCanonicalIndex(r), '# project');
  return r;
}

describe('links (layer-aware)', () => {
  it('lists all supported agents', () => {
    expect([...SUPPORTED_AGENTS]).toEqual(['claude','codex','pi','gemini','opencode','copilot']);
  });
  it('creates and detects a global symlink', () => {
    const h = tmpHome();
    linkAgent('global', 'codex', h);
    expect(fs.lstatSync(codexGlobalFile(h)).isSymbolicLink()).toBe(true);
    expect(isLinked('global', 'codex', h)).toBe(true);
    unlinkAgent('global', 'codex', h);
    expect(isLinked('global', 'codex', h)).toBe(false);
  });
  it('creates a copilot global symlink', () => {
    const h = tmpHome();
    linkAgent('global', 'copilot', h);
    expect(isLinked('global', 'copilot', h)).toBe(true);
  });
  it('creates nested project symlink for copilot', () => {
    const r = tmpRepo();
    linkAgent('project', 'copilot', r);
    const target = projectCopilotFile(r);
    expect(fs.lstatSync(target).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(target)).toBe(fs.realpathSync(projectCanonicalIndex(r)));
  });
  it('replaces a pre-existing real project file with a symlink', () => {
    const r = tmpRepo();
    fs.writeFileSync(projectIndexFile(r), 'stale real file');
    linkAgent('project', 'codex', r);
    expect(fs.lstatSync(projectIndexFile(r)).isSymbolicLink()).toBe(true);
  });
  it('reads configured agents from global config', () => {
    const h = tmpHome();
    fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ agents: ['codex','gemini'] }));
    expect(readConfiguredAgents(h)).toEqual(['codex','gemini']);
    const h2 = tmpHome();
    expect(readConfiguredAgents(h2)).toEqual([]);
  });
  it('migrates tools → agents in config.json on read', () => {
    const h = tmpHome();
    fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ tools: ['claude'] }));
    expect(readConfiguredAgents(h)).toEqual(['claude']);
    const raw = JSON.parse(fs.readFileSync(path.join(globalDir(h), 'config.json'), 'utf8'));
    expect(raw.agents).toEqual(['claude']);
    expect(raw.tools).toBeUndefined();
  });
});
```

**`test/link.test.ts`:** Replace entire file:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLink } from '../src/commands/link.js';
import { globalDir, globalIndexFile } from '../src/paths.js';
import { SUPPORTED_AGENTS } from '../src/links.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlk-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ agents: [] }));
  return h;
}

describe('runLink', () => {
  it('adds and persists an agent link', () => {
    const home = tmpHome();
    const res = runLink({ home, add: ['claude'] });
    expect(res.linked).toContain('claude');
    expect(res.agents).toContain('claude');
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.seh', 'config.json'), 'utf8'));
    expect(cfg.agents).toContain('claude');
  });
  it('removes an agent link and updates config', () => {
    const home = tmpHome();
    runLink({ home, add: ['claude'] });
    const res = runLink({ home, remove: ['claude'] });
    expect(res.unlinked).toContain('claude');
    expect(res.agents).not.toContain('claude');
  });
  it('throws on malformed config.json', () => {
    const home = tmpHome();
    fs.writeFileSync(path.join(home, '.seh', 'config.json'), 'not json');
    expect(() => runLink({ home, add: ['claude'] })).toThrow(/Malformed config.json/);
  });
  it('persists copilot in config even though it has no global link', () => {
    const home = tmpHome();
    const res = runLink({ home, add: ['copilot', 'codex'] });
    expect(res.agents).toEqual(expect.arrayContaining(['copilot', 'codex']));
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.seh', 'config.json'), 'utf8'));
    expect(cfg.agents).toEqual(expect.arrayContaining(['copilot', 'codex']));
  });
  it('rejects an unknown agent', () => {
    const home = tmpHome();
    expect(() => runLink({ home, add: ['bogus'] })).toThrow(/Unknown agent/);
  });
});
```

**`test/e2e.test.ts`:** Update imports and calls:
- `import { linkAgent, isLinked }` (was `linkTool`)
- `runInitGlobal({ home, agents: [] })` (was `tools: []`)
- `runInitGlobal({ home, agents: ['claude',...] })` (was `tools: [...]`)
- `for (const t of [...]) linkAgent('global', t, home)` (was `linkTool`)
- `runInitProject({ ..., projectAgents: ['codex','gemini','copilot'], home })` (was `projectTools`)

**`test/initGlobal.test.ts`:** Update:
- `runInitGlobal({ home, tools: ['claude'] })` → `runInitGlobal({ home, agents: ['claude'] })`
- `expect(cfg.tools).toEqual(['claude'])` → `expect(cfg.agents).toEqual(['claude'])`

**`test/package.test.ts`:** Update config JSON fixtures:
- `JSON.stringify({ tools: ['claude', 'codex'] })` → `JSON.stringify({ agents: ['claude', 'codex'] })`
- `expect(cfg.tools).toEqual(...)` → `expect(cfg.agents).toEqual(...)`

**`test/package-resolver.test.ts`:** Update config JSON fixtures:
- `JSON.stringify({ tools: ['claude'] })` → `JSON.stringify({ agents: ['claude'] })`
- `JSON.stringify({ tools: [], packagePath: pkg })` → `JSON.stringify({ agents: [], packagePath: pkg })`

**`test/sync.test.ts`:** Update:
- `projectTools: []` → `projectAgents: []`
- `projectTools: ['codex', 'gemini']` → `projectAgents: ['codex', 'gemini']`

**`test/cli.test.ts`:** Update:
- `import { SUPPORTED_TOOLS }` → `import { SUPPORTED_AGENTS }`
- `expect([...SUPPORTED_TOOLS])` → `expect([...SUPPORTED_AGENTS])`
- `'exposes all supported tools'` → `'exposes all supported agents'`

- [ ] **Step 11: Run full test suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all 96 tests pass.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(agents): rename --tools/linkTool/SUPPORTED_TOOLS to --agents/linkAgent/SUPPORTED_AGENTS"
```

---

## Task 2: Path helpers + `SkillEntry` type already in Task 1; now add skill path helpers

**Files:**
- Modify: `src/paths.ts`

- [ ] **Step 1: Append skill path helpers to `src/paths.ts`**

```typescript
export const sehSkillsDir = (h: string = home()) => path.join(h, '.seh', 'skills');
export const sehSkillDir = (h: string = home(), name: string) => path.join(h, '.seh', 'skills', name);
export const packageSkillsDir = (p: string) => path.join(p, 'skills');
export const packageSkillDir = (p: string, name: string) => path.join(p, 'skills', name);
```

- [ ] **Step 2: Run tests — no regressions**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/paths.ts
git commit -m "feat(skills): add skill path helpers to paths.ts"
```

---

## Task 3: `seh skills add` command

**Files:**
- Create: `src/commands/skills.ts`
- Create: `test/skills.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/skills.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runSkillsAdd } from '../src/commands/skills.js';
import { runPackageInit } from '../src/commands/package.js';
import { packageSkillDir, packageHarnessJson } from '../src/paths.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehsk-'));
}

function tmpPkg(): string {
  const base = tmpDir();
  const p = path.join(base, 'my-harness');
  runPackageInit({ packagePath: p });
  return p;
}

function tmpGitRepo(fileName: string, content: string): string {
  const repo = tmpDir();
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, fileName), content);
  execSync('git add .', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: repo, stdio: 'pipe' });
  return repo;
}

describe('runSkillsAdd --vendor', () => {
  it('clones skill files into package/skills/<name>/', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('caveman.md', '# Caveman\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'caveman', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(packageSkillDir(pkg, 'caveman'))).toBe(true);
    expect(fs.readFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), 'utf8')).toBe('# Caveman\n');
  });

  it('does not leave a .git directory in the skill dir', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# Skill\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(path.join(packageSkillDir(pkg, 'myskill'), '.git'))).toBe(false);
  });

  it('writes vendor entry to harness.json', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.myskill?.type).toBe('vendor');
  });

  it('throws when skill already exists without --force', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg }))
      .toThrow('already exists');
  });

  it('overwrites with --force', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('skill.md', '# X\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsAdd({ url: `file://${repo}`, skillName: 'dup', type: 'vendor', packagePath: pkg, force: true }))
      .not.toThrow();
  });
});

describe('runSkillsAdd --reference', () => {
  it('adds reference entry to harness.json without fetching files', () => {
    const pkg = tmpPkg();
    runSkillsAdd({
      url: 'https://github.com/JuliusBrussee/caveman',
      skillName: 'caveman',
      type: 'reference',
      ref: 'main',
      packagePath: pkg,
    });
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.caveman?.type).toBe('reference');
    expect(harness.skills?.caveman?.source).toBe('https://github.com/JuliusBrussee/caveman');
    expect(harness.skills?.caveman?.ref).toBe('main');
    expect(fs.existsSync(packageSkillDir(pkg, 'caveman'))).toBe(false);
  });

  it('appends skill dir to package .gitignore', () => {
    const pkg = tmpPkg();
    runSkillsAdd({
      url: 'https://github.com/JuliusBrussee/caveman',
      skillName: 'caveman',
      type: 'reference',
      packagePath: pkg,
    });
    const gi = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8');
    expect(gi).toContain('skills/caveman/');
  });

  it('does not duplicate .gitignore entry on re-run', () => {
    const pkg = tmpPkg();
    runSkillsAdd({ url: 'https://github.com/x/y', skillName: 'y', type: 'reference', packagePath: pkg });
    runSkillsAdd({ url: 'https://github.com/x/y', skillName: 'y', type: 'reference', packagePath: pkg, force: true });
    const gi = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8');
    expect((gi.match(/skills\/y\//g) ?? []).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/skills.test.ts
```

Expected: FAIL — `skills.ts` does not exist.

- [ ] **Step 3: Create `src/commands/skills.ts`**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { packageSkillDir, packageSkillsDir, packageHarnessJson } from '../paths.js';
import type { HarnessPackage, SkillEntry } from '../types.js';

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function addToGitignore(packagePath: string, entry: string): void {
  const gi = path.join(packagePath, '.gitignore');
  const existing = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (existing.includes(entry)) return;
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gi, existing + sep + entry + '\n');
}

function readHarness(packagePath: string): HarnessPackage {
  const p = packageHarnessJson(packagePath);
  if (!fs.existsSync(p)) throw new Error(`No harness.json at ${packagePath}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeHarness(packagePath: string, harness: HarnessPackage): void {
  fs.writeFileSync(packageHarnessJson(packagePath), JSON.stringify(harness, null, 2) + '\n');
}

export function runSkillsAdd(opts: {
  url: string;
  skillName: string;
  type: 'vendor' | 'reference';
  ref?: string;
  packagePath: string;
  force?: boolean;
}): void {
  const skillDir = packageSkillDir(opts.packagePath, opts.skillName);

  if (fs.existsSync(skillDir) && !opts.force) {
    throw new Error(`Skill '${opts.skillName}' already exists at ${skillDir}. Use --force to overwrite.`);
  }

  const harness = readHarness(opts.packagePath);
  if (!harness.skills) harness.skills = {};

  if (opts.type === 'vendor') {
    const ref = opts.ref ?? 'main';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehskv-'));
    try {
      execSync(`git clone --depth 1 --branch ${ref} ${opts.url} ${tmp}`, { stdio: 'pipe' });
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
      copyDir(tmp, skillDir);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    harness.skills[opts.skillName] = { type: 'vendor' };
  } else {
    harness.skills[opts.skillName] = {
      type: 'reference',
      source: opts.url,
      ref: opts.ref ?? 'main',
    };
    addToGitignore(opts.packagePath, `skills/${opts.skillName}/`);
  }

  writeHarness(opts.packagePath, harness);
}

export function runSkillsUpdate(opts: {
  skillName?: string;
  packagePath: string;
}): { updated: string[] } {
  const harness = readHarness(opts.packagePath);
  const entries = Object.entries(harness.skills ?? {});
  const toUpdate = opts.skillName
    ? entries.filter(([name]) => name === opts.skillName)
    : entries.filter(([, entry]) => entry.type === 'reference');

  if (opts.skillName && toUpdate.length === 0) {
    throw new Error(`Skill '${opts.skillName}' not found in harness.json`);
  }

  const updated: string[] = [];
  for (const [name, entry] of toUpdate) {
    if (entry.type !== 'reference') {
      throw new Error(`Skill '${name}' is vendored — nothing to update`);
    }
    const skillDir = packageSkillDir(opts.packagePath, name);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehsku-'));
    try {
      execSync(`git clone --depth 1 --branch ${entry.ref} ${entry.source} ${tmp}`, { stdio: 'pipe' });
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
      copyDir(tmp, skillDir);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    updated.push(name);
  }
  return { updated };
}

export function runSkillsList(opts: {
  packagePath: string;
}): { skills: Array<{ name: string; type: string; source?: string; ref?: string; onDisk: boolean }> } {
  const harness = readHarness(opts.packagePath);
  const skills = Object.entries(harness.skills ?? {}).map(([name, entry]) => ({
    name,
    type: entry.type,
    source: entry.type === 'reference' ? entry.source : undefined,
    ref: entry.type === 'reference' ? entry.ref : undefined,
    onDisk: fs.existsSync(packageSkillDir(opts.packagePath, name)),
  }));

  // Also include vendored skills that exist on disk but aren't in harness.json
  const skillsDir = packageSkillsDir(opts.packagePath);
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !skills.find((s) => s.name === entry.name)) {
        skills.push({ name: entry.name, type: 'vendor', onDisk: true });
      }
    }
  }

  return { skills: skills.sort((a, b) => a.name.localeCompare(b.name)) };
}
```

- [ ] **Step 4: Run new tests — all must pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/skills.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/skills.ts test/skills.test.ts
git commit -m "feat(skills): add runSkillsAdd, runSkillsUpdate, runSkillsList commands"
```

---

## Task 4: Add tests for `runSkillsUpdate` and `runSkillsList`

**Files:**
- Modify: `test/skills.test.ts`

- [ ] **Step 1: Append failing tests for update and list to `test/skills.test.ts`**

Append after the existing describe blocks:

```typescript
describe('runSkillsUpdate', () => {
  it('re-fetches a referenced skill from local repo', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('caveman.md', '# v1\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'caveman', type: 'reference', ref: 'main', packagePath: pkg });
    // Manually create the skill dir to simulate a previously fetched state
    fs.mkdirSync(packageSkillDir(pkg, 'caveman'), { recursive: true });
    fs.writeFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), '# old\n');
    // Update from the repo (which has v1)
    const { updated } = runSkillsUpdate({ skillName: 'caveman', packagePath: pkg });
    expect(updated).toContain('caveman');
    expect(fs.readFileSync(path.join(packageSkillDir(pkg, 'caveman'), 'caveman.md'), 'utf8')).toBe('# v1\n');
  });

  it('throws when skill is not in harness.json', () => {
    const pkg = tmpPkg();
    expect(() => runSkillsUpdate({ skillName: 'nonexistent', packagePath: pkg })).toThrow("not found");
  });

  it('throws when skill is vendored', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('s.md', '# S\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
    expect(() => runSkillsUpdate({ skillName: 'myskill', packagePath: pkg })).toThrow('vendored');
  });
});

describe('runSkillsList', () => {
  it('returns empty list when no skills', () => {
    const pkg = tmpPkg();
    expect(runSkillsList({ packagePath: pkg }).skills).toEqual([]);
  });

  it('lists vendor and reference skills from harness.json', () => {
    const pkg = tmpPkg();
    const repo = tmpGitRepo('v.md', '# V\n');
    runSkillsAdd({ url: `file://${repo}`, skillName: 'vendor-skill', type: 'vendor', packagePath: pkg });
    runSkillsAdd({ url: 'https://github.com/x/ref', skillName: 'ref-skill', type: 'reference', packagePath: pkg });
    const { skills } = runSkillsList({ packagePath: pkg });
    expect(skills.find(s => s.name === 'vendor-skill')?.type).toBe('vendor');
    expect(skills.find(s => s.name === 'ref-skill')?.type).toBe('reference');
    expect(skills.find(s => s.name === 'ref-skill')?.source).toBe('https://github.com/x/ref');
    expect(skills.find(s => s.name === 'vendor-skill')?.onDisk).toBe(true);
    expect(skills.find(s => s.name === 'ref-skill')?.onDisk).toBe(false);
  });
});
```

Also add `runSkillsUpdate` and `runSkillsList` to the import at the top:

```typescript
import { runSkillsAdd, runSkillsUpdate, runSkillsList } from '../src/commands/skills.js';
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/skills.test.ts
```

Expected: FAIL — the new tests reference `runSkillsUpdate`/`runSkillsList` which are already implemented in Task 3. They should actually pass. Run and confirm all pass.

- [ ] **Step 3: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add test/skills.test.ts
git commit -m "test(skills): add tests for runSkillsUpdate and runSkillsList"
```

---

## Task 5: `seh package install` command

**Files:**
- Create: `src/commands/install.ts`
- Create: `test/install.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/install.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runPackageInstall } from '../src/commands/install.js';
import { runPackageInit, runPackageUse } from '../src/commands/package.js';
import { runSkillsAdd } from '../src/commands/skills.js';
import { sehSkillDir, sehSkillsDir, packageSkillDir, globalConfigFile } from '../src/paths.js';
import { SKILL_TARGETS } from '../src/links.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehins-'));
}

function tmpHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
}

function tmpPkgWithSkill(skillName: string): { pkg: string; home: string } {
  const base = tmpDir();
  const pkg = path.join(base, 'my-harness');
  runPackageInit({ packagePath: pkg });
  // Create a vendor skill directly (no git clone needed for install tests)
  const skillDir = packageSkillDir(pkg, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, `${skillName}.md`), `# ${skillName}\n`);
  // Write skill entry in harness.json
  const hj = path.join(pkg, 'harness.json');
  const h = JSON.parse(fs.readFileSync(hj, 'utf8'));
  h.skills = { [skillName]: { type: 'vendor' } };
  fs.writeFileSync(hj, JSON.stringify(h, null, 2) + '\n');
  const home = tmpHome();
  return { pkg, home };
}

describe('runPackageInstall --skills', () => {
  it('creates ~/.seh/skills/<name>/ symlink into package', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    const { installedSkills } = runPackageInstall({ skills: true, agents: [], home });
    expect(installedSkills).toContain('caveman');
    const sehTarget = sehSkillDir(home, 'caveman');
    expect(fs.lstatSync(sehTarget).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(sehTarget)).toBe(fs.realpathSync(packageSkillDir(pkg, 'caveman')));
  });

  it('creates agent skill symlink for claude', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    runPackageInstall({ skills: true, agents: ['claude'], home });
    const claudeSkillDir = SKILL_TARGETS['claude']!(home, 'caveman');
    expect(fs.lstatSync(claudeSkillDir).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(claudeSkillDir)).toBe(fs.realpathSync(sehSkillDir(home, 'caveman')));
  });

  it('skips agents not in SKILL_TARGETS without error', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    runPackageUse({ packagePath: pkg, home });
    expect(() => runPackageInstall({ skills: true, agents: ['codex'], home })).not.toThrow();
  });

  it('throws when no active package', () => {
    const home = tmpHome();
    expect(() => runPackageInstall({ skills: true, agents: [], home })).toThrow('No active package');
  });
});

describe('runPackageInstall --harness', () => {
  it('writes ~/.seh/AGENTS.md from package global/', () => {
    const { pkg, home } = tmpPkgWithSkill('x');
    fs.writeFileSync(path.join(pkg, 'global', 'AGENTS.md'), '# My Rules\n');
    runPackageUse({ packagePath: pkg, home });
    const { installedHarness } = runPackageInstall({ harness: true, home });
    expect(installedHarness).toBe(true);
    expect(fs.readFileSync(path.join(home, '.seh', 'AGENTS.md'), 'utf8')).toBe('# My Rules\n');
  });
});

describe('runPackageInstall --all', () => {
  it('installs both harness and skills', () => {
    const { pkg, home } = tmpPkgWithSkill('caveman');
    fs.writeFileSync(path.join(pkg, 'global', 'AGENTS.md'), '# Rules\n');
    runPackageUse({ packagePath: pkg, home });
    const result = runPackageInstall({ all: true, agents: ['claude'], home });
    expect(result.installedHarness).toBe(true);
    expect(result.installedSkills).toContain('caveman');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/install.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/commands/install.ts`**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { readGlobalConfig, linkSkill } from '../links.js';
import { PackageResolver } from '../package-resolver.js';
import { runInitGlobal } from './initGlobal.js';
import {
  packageSkillsDir, packageSkillDir, packageHarnessJson,
  packageGlobalConfigJson, sehSkillsDir, sehSkillDir,
} from '../paths.js';
import type { HarnessPackage } from '../types.js';

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function readPackageAgents(packagePath: string): string[] {
  const p = packageGlobalConfigJson(packagePath);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    // Migration
    if (Array.isArray(raw.tools) && !raw.agents) return raw.tools as string[];
    return Array.isArray(raw.agents) ? (raw.agents as string[]) : [];
  } catch { return []; }
}

export function runPackageInstall(opts: {
  skills?: boolean;
  harness?: boolean;
  all?: boolean;
  agents?: string[];
  force?: boolean;
  home?: string;
}): { installedSkills: string[]; installedHarness: boolean } {
  const home = opts.home ?? os.homedir();
  const cfg = readGlobalConfig(home);
  if (!cfg.packagePath) throw new Error('No active package. Run `seh package use <path>` first.');

  const packagePath = cfg.packagePath;
  const doSkills = opts.skills || opts.all || false;
  const doHarness = opts.harness || opts.all || false;
  const installedSkills: string[] = [];
  let installedHarness = false;

  if (doHarness) {
    const resolver = new PackageResolver(packagePath);
    const packageAgents = readPackageAgents(packagePath);
    runInitGlobal({ home, agents: packageAgents, resolver, force: opts.force });
    installedHarness = true;
  }

  if (doSkills) {
    // Fetch referenced skills not yet on disk
    const hj = packageHarnessJson(packagePath);
    if (fs.existsSync(hj)) {
      const harness: HarnessPackage = JSON.parse(fs.readFileSync(hj, 'utf8'));
      for (const [name, entry] of Object.entries(harness.skills ?? {})) {
        if (entry.type !== 'reference') continue;
        const skillDir = packageSkillDir(packagePath, name);
        if (fs.existsSync(skillDir) && !opts.force) continue;
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sehins-'));
        try {
          execSync(`git clone --depth 1 --branch ${entry.ref} ${entry.source} ${tmp}`, { stdio: 'pipe' });
          if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
          copyDir(tmp, skillDir);
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      }
    }

    // Symlink each skill dir from package → ~/.seh/skills/<name>/ → agent dirs
    const skillsDir = packageSkillsDir(packagePath);
    if (!fs.existsSync(skillsDir)) return { installedSkills, installedHarness };

    fs.mkdirSync(sehSkillsDir(home), { recursive: true });
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const pkgSkillPath = packageSkillDir(packagePath, name);
      const sehTarget = sehSkillDir(home, name);

      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false }) && !opts.force) continue;
      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false })) {
        fs.rmSync(sehTarget, { force: true });
      }
      const rel = path.relative(path.dirname(sehTarget), pkgSkillPath);
      fs.symlinkSync(rel, sehTarget);

      for (const agent of opts.agents ?? []) {
        linkSkill(agent, name, home, sehTarget);
      }
      installedSkills.push(name);
    }
  }

  return { installedSkills, installedHarness };
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/install.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/install.ts test/install.test.ts
git commit -m "feat(skills): add runPackageInstall command"
```

---

## Task 6: Update `runPackageInit` to create `skills/` dir

**Files:**
- Modify: `src/commands/package.ts`
- Modify: `test/package.test.ts`

- [ ] **Step 1: Write failing test**

Add to the `describe('runPackageInit', ...)` block in `test/package.test.ts`:

```typescript
import { packageSkillsDir } from '../src/paths.js';

// Inside describe('runPackageInit', ...):
  it('creates skills/ directory', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p });
    expect(fs.existsSync(packageSkillsDir(p))).toBe(true);
  });
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package.test.ts
```

Expected: FAIL — `skills/` not created yet.

- [ ] **Step 3: Update `src/commands/package.ts`**

In `runPackageInit`, add `packageSkillsDir(p)` to the dirs array:

```typescript
  for (const d of [
    packageGlobalDir(p),
    packageTemplatesStackDir(p),
    packageTemplatesProjectDir(p),
    packageProjectsDir(p),
    packageSkillsDir(p),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
```

Add `packageSkillsDir` to the imports from `'../paths.js'`.

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/package.ts test/package.test.ts
git commit -m "feat(skills): runPackageInit creates skills/ directory"
```

---

## Task 7: Wire new commands into CLI

**Files:**
- Modify: `src/cli.ts`
- Modify: `test/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Append to `test/cli.test.ts`:

```typescript
import { packageSkillsDir } from '../src/paths.js';

describe('seh skills commands (CLI)', () => {
  it('seh skills command group registers add, update, list subcommands', () => {
    const program = buildProgram();
    const skillsCmd = program.commands.find((c) => c.name() === 'skills');
    expect(skillsCmd).toBeDefined();
    const subNames = skillsCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('add');
    expect(subNames).toContain('update');
    expect(subNames).toContain('list');
  });

  it('seh package install command is registered', () => {
    const program = buildProgram();
    const pkgCmd = program.commands.find((c) => c.name() === 'package');
    expect(pkgCmd).toBeDefined();
    const subNames = pkgCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('install');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/cli.test.ts
```

Expected: FAIL — `skills` command and `package install` not registered.

- [ ] **Step 3: Update `src/cli.ts`**

Add imports at the top:

```typescript
import { runSkillsAdd, runSkillsUpdate, runSkillsList } from './commands/skills.js';
import { runPackageInstall } from './commands/install.js';
```

Add a helper to parse GitHub shorthand URLs at the top of `buildProgram()`:

```typescript
  function parseSkillUrl(raw: string): { url: string; skillName: string } {
    const ghShorthand = raw.match(/^github:([^/]+)\/([^/]+)$/);
    if (ghShorthand) return { url: `https://github.com/${ghShorthand[1]}/${ghShorthand[2]}`, skillName: ghShorthand[2] };
    const ghUrl = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (ghUrl) return { url: raw, skillName: ghUrl[2] };
    throw new Error(`Unsupported URL: ${raw}. Use https://github.com/owner/repo or github:owner/repo`);
  }
```

Add `seh skills` command group before `return program`:

```typescript
  const skills = program.command('skills').description('Manage skills in the active harness package');

  skills
    .command('add <url>')
    .description('Add a skill from a GitHub URL to the active package')
    .option('--vendor', 'copy skill files into the package (committed to git)')
    .option('--reference', 'track skill as external reference (fetched on install)')
    .option('--ref <branch>', 'branch or tag (default: main)')
    .option('-f, --force', 'overwrite existing skill')
    .action(async (url: string, opts: { vendor?: boolean; reference?: boolean; ref?: string; force?: boolean }) => {
      try {
        const { url: resolvedUrl, skillName } = parseSkillUrl(url);
        let type: 'vendor' | 'reference' | undefined;
        if (opts.vendor) type = 'vendor';
        else if (opts.reference) type = 'reference';
        else {
          const res = await prompts({
            type: 'select', name: 'type', message: 'How to add this skill?',
            choices: [
              { title: 'Vendor (copy into package, commit to git)', value: 'vendor' },
              { title: 'Reference (track externally, fetch on install)', value: 'reference' },
            ],
          });
          if (res.type === undefined) { console.log('seh: cancelled.'); process.exitCode = 0; return; }
          type = res.type as 'vendor' | 'reference';
        }
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) throw new Error('No active package. Run `seh package use <path>` first.');
        runSkillsAdd({ url: resolvedUrl, skillName, type, ref: opts.ref, packagePath: status.packagePath, force: opts.force });
        console.log(`seh: skill '${skillName}' added (${type})`);
      } catch (err) { fail(err); }
    });

  skills
    .command('update [name]')
    .description('Re-fetch referenced skill(s) from source')
    .action((name: string | undefined) => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) throw new Error('No active package.');
        const { updated } = runSkillsUpdate({ skillName: name, packagePath: status.packagePath });
        console.log(`seh: updated [${updated.join(', ') || 'none'}]`);
      } catch (err) { fail(err); }
    });

  skills
    .command('list')
    .description('List skills in the active package')
    .action(() => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) { console.log('seh: no active package'); return; }
        const { skills: list } = runSkillsList({ packagePath: status.packagePath });
        if (list.length === 0) { console.log('seh: no skills'); return; }
        for (const s of list) {
          const src = s.source ? `  ${s.source} (${s.ref})` : '';
          const disk = s.onDisk ? '✓' : '✗';
          console.log(`  ${disk} ${s.name}  [${s.type}]${src}`);
        }
      } catch (err) { fail(err); }
    });
```

Add `seh package install` to the existing `pkg` command group (after the existing `status` subcommand):

```typescript
  pkg
    .command('install')
    .description('Install harness and/or skills from the active package onto this machine')
    .option('--skills', 'install skills')
    .option('--harness', 'install global harness (AGENTS.md + agent symlinks)')
    .option('--all', 'install everything')
    .option('--agents <list>', 'comma-separated agents to link skills into')
    .option('-f, --force', 'overwrite existing files')
    .action(async (opts: { skills?: boolean; harness?: boolean; all?: boolean; agents?: string; force?: boolean }) => {
      try {
        let agents = parseList(opts.agents);
        if ((opts.skills || opts.all) && agents.length === 0 && !opts.all) {
          const configured = resolver.active
            ? (readGlobalConfig(os.homedir()).agents)
            : [];
          const res = await prompts({
            type: 'multiselect', name: 'agents', message: 'Install skills into which agents?',
            choices: SUPPORTED_AGENTS
              .filter((a) => a in (await import('./links.js')).SKILL_TARGETS)
              .map((a) => ({ title: a, value: a, selected: configured.includes(a) })),
          });
          if (res.agents === undefined) { console.log('seh: cancelled.'); process.exitCode = 0; return; }
          agents = res.agents;
        }
        const result = runPackageInstall({
          skills: opts.skills,
          harness: opts.harness,
          all: opts.all,
          agents,
          force: opts.force,
          home: os.homedir(),
        });
        if (result.installedHarness) console.log('seh: harness installed');
        if (result.installedSkills.length > 0) console.log(`seh: skills installed [${result.installedSkills.join(', ')}]`);
      } catch (err) { fail(err); }
    });
```

Add missing imports to `cli.ts`: `readGlobalConfig` and `SKILL_TARGETS` from `'./links.js'`. Replace the `await import('./links.js')` dynamic import in the install action with the statically imported `SKILL_TARGETS`:

```typescript
choices: SUPPORTED_AGENTS
  .filter((a) => a in SKILL_TARGETS)
  .map((a) => ({ title: a, value: a, selected: configured.includes(a) })),
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/cli.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Build to confirm TypeScript compiles**

```bash
cd /home/manuuuel/pocs/seh && npm run build
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts test/cli.test.ts
git commit -m "feat(skills): register seh skills add|update|list and seh package install in CLI"
```
