# Skill Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `seh skills add` with `--always`, `--when`, `--optional` flags that store routing metadata in `harness.json` and render a `## Skills` section in AGENTS.md on `seh sync`.

**Architecture:** Add an optional `invoke` discriminated union to `SkillEntry` in `types.ts`. `runSkillsAdd` accepts and stores it. `PackageResolver` exposes a `skills()` method. `runSync` reads skills via resolver and appends the rendered section via a new `buildSkillsSection` helper in `index-emitter.ts`.

**Tech Stack:** TypeScript, Node.js fs, Commander.js, Vitest

---

### Task 1: Extend `SkillEntry` type with `invoke` field

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/skills.test.ts` inside `describe('runSkillsAdd --vendor')`:

```ts
it('stores invoke.always in harness.json', () => {
  const pkg = tmpPkg();
  const repo = tmpGitRepo('skill.md', '# X\n');
  runSkillsAdd({
    url: `file://${repo}`,
    skillName: 'myskill',
    type: 'vendor',
    packagePath: pkg,
    invoke: { mode: 'always', label: 'every response' },
  });
  const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
  expect(harness.skills?.myskill?.invoke).toEqual({ mode: 'always', label: 'every response' });
});

it('stores invoke.when in harness.json', () => {
  const pkg = tmpPkg();
  const repo = tmpGitRepo('skill.md', '# X\n');
  runSkillsAdd({
    url: `file://${repo}`,
    skillName: 'myskill',
    type: 'vendor',
    packagePath: pkg,
    invoke: { mode: 'when', condition: 'bug / test failure' },
  });
  const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
  expect(harness.skills?.myskill?.invoke).toEqual({ mode: 'when', condition: 'bug / test failure' });
});

it('stores invoke.optional in harness.json', () => {
  const pkg = tmpPkg();
  const repo = tmpGitRepo('skill.md', '# X\n');
  runSkillsAdd({
    url: `file://${repo}`,
    skillName: 'myskill',
    type: 'vendor',
    packagePath: pkg,
    invoke: { mode: 'optional' },
  });
  const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
  expect(harness.skills?.myskill?.invoke).toEqual({ mode: 'optional' });
});

it('omits invoke field when not provided', () => {
  const pkg = tmpPkg();
  const repo = tmpGitRepo('skill.md', '# X\n');
  runSkillsAdd({ url: `file://${repo}`, skillName: 'myskill', type: 'vendor', packagePath: pkg });
  const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
  expect(harness.skills?.myskill?.invoke).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/skills.test.ts 2>&1 | tail -20
```

Expected: FAIL — TypeScript error on unknown `invoke` property.

- [ ] **Step 3: Add `invoke` to `SkillEntry` in `src/types.ts`**

Replace the existing `SkillEntry` type:

```ts
export type SkillInvoke =
  | { mode: 'always'; label?: string }
  | { mode: 'when'; condition: string }
  | { mode: 'optional' };

export type SkillEntry =
  | { type: 'vendor'; invoke?: SkillInvoke }
  | { type: 'reference'; source: string; ref: string; invoke?: SkillInvoke };
```

- [ ] **Step 4: Pass `invoke` through in `runSkillsAdd` in `src/commands/skills.ts`**

Change the function signature opts type to include `invoke?: SkillInvoke` and write it to harness:

```ts
import type { HarnessPackage, SkillEntry, SkillInvoke } from '../types.js';

export function runSkillsAdd(opts: {
  url: string;
  skillName: string;
  type: 'vendor' | 'reference';
  ref?: string;
  packagePath: string;
  force?: boolean;
  invoke?: SkillInvoke;
}): void {
```

In the vendor branch, change:
```ts
harness.skills[opts.skillName] = { type: 'vendor' };
```
to:
```ts
const vendorEntry: SkillEntry = { type: 'vendor' };
if (opts.invoke) vendorEntry.invoke = opts.invoke;
harness.skills[opts.skillName] = vendorEntry;
```

In the reference branch, change:
```ts
harness.skills[opts.skillName] = {
  type: 'reference',
  source: opts.url,
  ref: opts.ref ?? 'main',
};
```
to:
```ts
const refEntry: SkillEntry = {
  type: 'reference',
  source: opts.url,
  ref: opts.ref ?? 'main',
};
if (opts.invoke) refEntry.invoke = opts.invoke;
harness.skills[opts.skillName] = refEntry;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/skills.test.ts 2>&1 | tail -20
```

Expected: all skills tests PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/types.ts src/commands/skills.ts test/skills.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(skills): add invoke field to SkillEntry and runSkillsAdd"
```

---

### Task 2: Add `--always`, `--when`, `--optional` flags to CLI

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/cli.test.ts`:

```ts
import { buildProgram } from '../src/cli.js';
import { runPackageInit } from '../src/commands/package.js';
import { packageHarnessJson } from '../src/paths.js';
import { execSync } from 'node:child_process';

// Helper — add after existing helpers in the file
function tmpGitRepoForCli(fileName: string, content: string): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sehclitest-'));
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, fileName), content);
  execSync('git add .', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: repo, stdio: 'pipe' });
  return repo;
}
```

Add inside an appropriate describe block or new describe block:

```ts
describe('skills add routing flags', () => {
  it('--always stores invoke.always in harness.json', async () => {
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    runPackageInit({ packagePath: pkg });
    const repo = tmpGitRepoForCli('s.md', '# S\n');
    const prog = buildProgram(pkg);
    await prog.parseAsync([
      'node', 'seh', 'skills', 'add', `file://${repo}`,
      '--vendor', '--always', 'every response',
      '--home', os.homedir(),
    ]);
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.s?.invoke).toEqual({ mode: 'always', label: 'every response' });
  });

  it('--when stores invoke.when in harness.json', async () => {
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    runPackageInit({ packagePath: pkg });
    const repo = tmpGitRepoForCli('s.md', '# S\n');
    const prog = buildProgram(pkg);
    await prog.parseAsync([
      'node', 'seh', 'skills', 'add', `file://${repo}`,
      '--vendor', '--when', 'bug / test failure',
      '--home', os.homedir(),
    ]);
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.s?.invoke).toEqual({ mode: 'when', condition: 'bug / test failure' });
  });

  it('--optional stores invoke.optional in harness.json', async () => {
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    runPackageInit({ packagePath: pkg });
    const repo = tmpGitRepoForCli('s.md', '# S\n');
    const prog = buildProgram(pkg);
    await prog.parseAsync([
      'node', 'seh', 'skills', 'add', `file://${repo}`,
      '--vendor', '--optional',
      '--home', os.homedir(),
    ]);
    const harness = JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));
    expect(harness.skills?.s?.invoke).toEqual({ mode: 'optional' });
  });
});
```

**Note:** The CLI test approach needs `buildProgram` to accept a package path override for the active package. Check `test/cli.test.ts` for the existing pattern — if it uses `process.env` or a different override mechanism, match that instead of adding a parameter.

- [ ] **Step 2: Check the existing CLI test pattern**

```bash
cd /home/manuuuel/pocs/seh && head -60 test/cli.test.ts
```

Adapt the test above to match the pattern used there (env var, config file, or constructor param).

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/cli.test.ts 2>&1 | tail -20
```

Expected: FAIL — flags not defined.

- [ ] **Step 4: Add flags to `skills add` command in `src/cli.ts`**

In `src/cli.ts`, locate the `skills.command('add <url>')` block. Add three mutually exclusive options after the existing options:

```ts
.option('--always [label]', 'invoke this skill every response')
.option('--when <condition>', 'invoke this skill when condition matches')
.option('--optional', 'skill available, agent decides when to use it')
```

In the `.action` handler, after computing `type`, build the `invoke` value and pass it to `runSkillsAdd`:

```ts
// Build invoke from flags — mutually exclusive
let invoke: import('./types.js').SkillInvoke | undefined;
if (opts.always !== undefined) {
  invoke = { mode: 'always', label: typeof opts.always === 'string' ? opts.always : undefined };
} else if (opts.when) {
  invoke = { mode: 'when', condition: opts.when };
} else if (opts.optional) {
  invoke = { mode: 'optional' };
}

runSkillsAdd({ url: resolvedUrl, skillName, type, ref: opts.ref, packagePath: status.packagePath, force: opts.force, invoke });
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/cli.test.ts 2>&1 | tail -20
```

Expected: all CLI tests PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/cli.ts test/cli.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(cli): add --always/--when/--optional flags to skills add"
```

---

### Task 3: `buildSkillsSection` helper in `index-emitter.ts`

**Files:**
- Modify: `src/index-emitter.ts`
- Modify: `test/index-emitter.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/index-emitter.test.ts`:

```ts
import { buildSkillsSection } from '../src/index-emitter.js';
import type { SkillEntry } from '../src/types.js';

describe('buildSkillsSection', () => {
  it('returns empty string when no skills have invoke', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor' },
    };
    expect(buildSkillsSection(skills)).toBe('');
  });

  it('returns empty string when skills record is empty', () => {
    expect(buildSkillsSection({})).toBe('');
  });

  it('renders always section', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always', label: 'every response' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('## Skills');
    expect(out).toContain('Always invoke:');
    expect(out).toContain('`caveman` — every response');
  });

  it('renders always entry without label', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('`caveman`');
    expect(out).not.toContain('undefined');
  });

  it('renders when section', () => {
    const skills: Record<string, SkillEntry> = {
      'systematic-debugging': { type: 'vendor', invoke: { mode: 'when', condition: 'bug / test failure' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('Invoke when:');
    expect(out).toContain('`systematic-debugging` — bug / test failure');
  });

  it('renders optional section', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor', invoke: { mode: 'optional' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('Optional:');
    expect(out).toContain('`xlsx`');
  });

  it('renders all three sections in order: always, when, optional', () => {
    const skills: Record<string, SkillEntry> = {
      'caveman': { type: 'vendor', invoke: { mode: 'always', label: 'every response' } },
      'xlsx': { type: 'vendor', invoke: { mode: 'optional' } },
      'systematic-debugging': { type: 'vendor', invoke: { mode: 'when', condition: 'bug / test failure' } },
    };
    const out = buildSkillsSection(skills);
    const alwaysIdx = out.indexOf('Always invoke:');
    const whenIdx = out.indexOf('Invoke when:');
    const optIdx = out.indexOf('Optional:');
    expect(alwaysIdx).toBeLessThan(whenIdx);
    expect(whenIdx).toBeLessThan(optIdx);
  });

  it('skips skills with no invoke', () => {
    const skills: Record<string, SkillEntry> = {
      'xlsx': { type: 'vendor' },
      'caveman': { type: 'vendor', invoke: { mode: 'always' } },
    };
    const out = buildSkillsSection(skills);
    expect(out).toContain('`caveman`');
    expect(out).not.toContain('`xlsx`');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/index-emitter.test.ts 2>&1 | tail -20
```

Expected: FAIL — `buildSkillsSection` not exported.

- [ ] **Step 3: Implement `buildSkillsSection` in `src/index-emitter.ts`**

Add after the existing exports:

```ts
import type { SkillEntry } from './types.js';

export function buildSkillsSection(skills: Record<string, SkillEntry>): string {
  const always: string[] = [];
  const when: string[] = [];
  const optional: string[] = [];

  for (const [name, entry] of Object.entries(skills).sort(([a], [b]) => a.localeCompare(b))) {
    if (!entry.invoke) continue;
    if (entry.invoke.mode === 'always') {
      always.push(entry.invoke.label ? `- \`${name}\` — ${entry.invoke.label}` : `- \`${name}\``);
    } else if (entry.invoke.mode === 'when') {
      when.push(`- \`${name}\` — ${entry.invoke.condition}`);
    } else if (entry.invoke.mode === 'optional') {
      optional.push(`- \`${name}\``);
    }
  }

  if (always.length === 0 && when.length === 0 && optional.length === 0) return '';

  const parts: string[] = ['## Skills'];
  if (always.length > 0) parts.push(`Always invoke:\n${always.join('\n')}`);
  if (when.length > 0) parts.push(`Invoke when:\n${when.join('\n')}`);
  if (optional.length > 0) parts.push(`Optional:\n${optional.join('\n')}`);

  return parts.join('\n\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/index-emitter.test.ts 2>&1 | tail -20
```

Expected: all index-emitter tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/index-emitter.ts test/index-emitter.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(index-emitter): add buildSkillsSection helper"
```

---

### Task 4: `PackageResolver.skills()` method

**Files:**
- Modify: `src/package-resolver.ts`
- Modify: `test/package-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/package-resolver.test.ts`:

```ts
import { runPackageInit } from '../src/commands/package.js';
import { runSkillsAdd } from '../src/commands/skills.js';
import { execSync } from 'node:child_process';

function tmpGitRepo(fileName: string, content: string): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpr-'));
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, fileName), content);
  execSync('git add .', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: repo, stdio: 'pipe' });
  return repo;
}

describe('PackageResolver.skills()', () => {
  it('returns empty object when no active package', () => {
    const r = new PackageResolver(null);
    expect(r.skills()).toEqual({});
  });

  it('returns empty object when harness.json has no skills', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehbase-'));
    const pkg = path.join(base, 'my-harness');
    runPackageInit({ packagePath: pkg });
    const r = new PackageResolver(pkg);
    expect(r.skills()).toEqual({});
  });

  it('returns skills map from harness.json', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehbase-'));
    const pkg = path.join(base, 'my-harness');
    runPackageInit({ packagePath: pkg });
    const repo = tmpGitRepo('s.md', '# S\n');
    runSkillsAdd({
      url: `file://${repo}`,
      skillName: 'caveman',
      type: 'vendor',
      packagePath: pkg,
      invoke: { mode: 'always', label: 'every response' },
    });
    const r = new PackageResolver(pkg);
    const skills = r.skills();
    expect(skills['caveman']?.type).toBe('vendor');
    expect(skills['caveman']?.invoke).toEqual({ mode: 'always', label: 'every response' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/package-resolver.test.ts 2>&1 | tail -20
```

Expected: FAIL — `skills` method not defined.

- [ ] **Step 3: Add `skills()` method to `PackageResolver` in `src/package-resolver.ts`**

Add import at top:

```ts
import type { HarnessPackage, SkillEntry } from './types.js';
import { packageHarnessJson } from './paths.js';
```

Add method inside `PackageResolver` class after `projectTemplateFiles`:

```ts
skills(): Record<string, SkillEntry> {
  if (!this.packagePath) return {};
  const p = packageHarnessJson(this.packagePath);
  if (!fs.existsSync(p)) return {};
  const harness: HarnessPackage = JSON.parse(fs.readFileSync(p, 'utf8'));
  return harness.skills ?? {};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/package-resolver.test.ts 2>&1 | tail -20
```

Expected: all package-resolver tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/package-resolver.ts test/package-resolver.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(resolver): add skills() method to PackageResolver"
```

---

### Task 5: Wire `## Skills` section into `seh sync`

**Files:**
- Modify: `src/commands/sync.ts`
- Modify: `test/sync.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/sync.test.ts` inside `describe('runSync with resolver')`:

```ts
it('appends ## Skills section when resolver has routed skills', () => {
  const r = repoWithProject();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
  const pkg = path.join(base, 'my-harness');
  runPackageInit({ packagePath: pkg });

  // Write harness.json with skills directly (avoid git clone in unit test)
  const harnessPath = path.join(pkg, 'harness.json');
  const harness = JSON.parse(fs.readFileSync(harnessPath, 'utf8'));
  harness.skills = {
    'caveman': { type: 'vendor', invoke: { mode: 'always', label: 'every response' } },
    'systematic-debugging': { type: 'vendor', invoke: { mode: 'when', condition: 'bug / test failure' } },
    'xlsx': { type: 'vendor' }, // no routing — should not appear
  };
  fs.writeFileSync(harnessPath, JSON.stringify(harness, null, 2) + '\n');

  const resolver = new PackageResolver(pkg);
  runSync({ root: r, technologies: ['typescript'], projectAgents: [], resolver });

  const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
  expect(idx).toContain('## Skills');
  expect(idx).toContain('Always invoke:');
  expect(idx).toContain('`caveman` — every response');
  expect(idx).toContain('Invoke when:');
  expect(idx).toContain('`systematic-debugging` — bug / test failure');
  expect(idx).not.toContain('`xlsx`');
});

it('omits ## Skills section when no skills have routing', () => {
  const r = repoWithProject();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
  const pkg = path.join(base, 'my-harness');
  runPackageInit({ packagePath: pkg });

  const resolver = new PackageResolver(pkg);
  runSync({ root: r, technologies: ['typescript'], projectAgents: [], resolver });

  const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
  expect(idx).not.toContain('## Skills');
});

it('omits ## Skills section when no resolver', () => {
  const r = repoWithProject();
  runSync({ root: r, technologies: ['typescript'], projectAgents: [] });
  const idx = fs.readFileSync(projectCanonicalIndex(r), 'utf8');
  expect(idx).not.toContain('## Skills');
});
```

Add import at top of test file:
```ts
import { runPackageInit } from '../src/commands/package.js';
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/sync.test.ts 2>&1 | tail -20
```

Expected: FAIL — `## Skills` not found.

- [ ] **Step 3: Update `buildProjectIndex` to accept and render skills**

In `src/commands/sync.ts`, update `buildProjectIndex` signature and body:

```ts
import { buildIndex, buildSkillsSection, type IndexEntry, titleOf } from '../index-emitter.js';
import type { SkillEntry } from '../types.js';

export function buildProjectIndex(
  root: string,
  technologies: string[],
  skills: Record<string, SkillEntry> = {},
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
  const index = buildIndex(projectPreamble(), entries);
  const skillsSection = buildSkillsSection(skills);
  return skillsSection ? index.trimEnd() + '\n\n' + skillsSection + '\n' : index;
}
```

- [ ] **Step 4: Pass skills to `buildProjectIndex` inside `runSync`**

In `runSync`, change the line that calls `buildProjectIndex`:

```ts
const skills = opts.resolver ? opts.resolver.skills() : {};
fs.writeFileSync(projectCanonicalIndex(opts.root), buildProjectIndex(opts.root, opts.technologies, skills));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/sync.test.ts 2>&1 | tail -20
```

Expected: all sync tests PASS.

- [ ] **Step 6: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test 2>&1 | tail -20
```

Expected: all tests PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/commands/sync.ts test/sync.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(sync): append ## Skills section from resolver in AGENTS.md"
```

---

### Task 6: Update `seh skills list` output with invoke column

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/cli.ts`
- Modify: `test/skills.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `describe('runSkillsList')` in `test/skills.test.ts`:

```ts
it('exposes invoke field in list output', () => {
  const pkg = tmpPkg();
  const repo = tmpGitRepo('v.md', '# V\n');
  runSkillsAdd({
    url: `file://${repo}`,
    skillName: 'vendor-skill',
    type: 'vendor',
    packagePath: pkg,
    invoke: { mode: 'always', label: 'every response' },
  });
  runSkillsAdd({
    url: 'https://github.com/x/ref',
    skillName: 'ref-skill',
    type: 'reference',
    packagePath: pkg,
    invoke: { mode: 'when', condition: 'bug / test failure' },
  });
  const { skills } = runSkillsList({ packagePath: pkg });
  expect(skills.find(s => s.name === 'vendor-skill')?.invoke).toEqual({ mode: 'always', label: 'every response' });
  expect(skills.find(s => s.name === 'ref-skill')?.invoke).toEqual({ mode: 'when', condition: 'bug / test failure' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/skills.test.ts 2>&1 | tail -20
```

Expected: FAIL — `invoke` not in list output.

- [ ] **Step 3: Update `runSkillsList` return type and implementation**

In `src/commands/skills.ts`, update the `runSkillsList` return type and mapping:

```ts
import type { HarnessPackage, SkillEntry, SkillInvoke } from '../types.js';

export function runSkillsList(opts: {
  packagePath: string;
}): { skills: Array<{ name: string; type: string; source?: string; ref?: string; onDisk: boolean; invoke?: SkillInvoke }> } {
  const harness = readHarness(opts.packagePath);
  const skills = Object.entries(harness.skills ?? {}).map(([name, entry]) => ({
    name,
    type: entry.type,
    source: entry.type === 'reference' ? entry.source : undefined,
    ref: entry.type === 'reference' ? entry.ref : undefined,
    onDisk: fs.existsSync(packageSkillDir(opts.packagePath, name)),
    invoke: entry.invoke,
  }));

  const skillsDir = packageSkillsDir(opts.packagePath);
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !skills.find((s) => s.name === entry.name)) {
        skills.push({ name: entry.name, type: 'vendor', onDisk: true, invoke: undefined });
      }
    }
  }

  return { skills: skills.sort((a, b) => a.name.localeCompare(b.name)) };
}
```

- [ ] **Step 4: Update `skills list` CLI output in `src/cli.ts`**

Locate the `skills.command('list')` action handler. Replace the console.log line:

```ts
for (const s of list) {
  const src = s.source ? `  ${s.source} (${s.ref})` : '';
  const disk = s.onDisk ? '✓' : '✗';
  let invokeStr = '';
  if (s.invoke) {
    if (s.invoke.mode === 'always') invokeStr = `  always${s.invoke.label ? `: ${s.invoke.label}` : ''}`;
    else if (s.invoke.mode === 'when') invokeStr = `  when: ${s.invoke.condition}`;
    else if (s.invoke.mode === 'optional') invokeStr = `  optional`;
  }
  console.log(`  ${disk} ${s.name}  [${s.type}]${invokeStr}${src}`);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- --reporter=verbose test/skills.test.ts 2>&1 | tail -20
```

Expected: all skills tests PASS.

- [ ] **Step 6: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 7: Build and smoke test**

```bash
cd /home/manuuuel/pocs/seh && npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git -C /home/manuuuel/pocs/seh add src/commands/skills.ts src/cli.ts test/skills.test.ts
git -C /home/manuuuel/pocs/seh commit -m "feat(skills): expose invoke field in list output and CLI display"
```
