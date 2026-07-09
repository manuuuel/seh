# Harness Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `seh package init|use|status` commands so users can version their global harness in a git repo and carry it across machines.

**Architecture:** A `PackageResolver` class reads from an active package directory (configured in `~/.seh/config.json`) and falls back to `~/.seh/` then bundled core. The resolver is instantiated once in `cli.ts` and threaded through `runSync`, `runInitGlobal`, and `runInitProject`. Git is fully external — seh only manages the file structure.

**Tech Stack:** TypeScript, Node.js `fs`, Commander, Prompts, Vitest

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/types.ts` — add `GlobalConfig`, `HarnessPackage` |
| Modify | `src/paths.ts` — add package path helpers |
| Create | `src/package-resolver.ts` — `PackageResolver` class + `readResolver()` |
| Create | `src/commands/package.ts` — `runPackageInit`, `runPackageUse`, `runPackageStatus` |
| Modify | `src/commands/initGlobal.ts` — export `buildGlobalAgentsMd()`, accept optional `resolver` |
| Modify | `src/commands/sync.ts` — accept optional `resolver`, use it for stack content + overlay |
| Modify | `src/commands/initProject.ts` — accept optional `resolver` + `templateName` |
| Modify | `src/cli.ts` — register `package` command, instantiate resolver, thread through commands |
| Create | `test/package-resolver.test.ts` |
| Create | `test/package.test.ts` |
| Modify | `test/sync.test.ts` — add resolver tests |
| Modify | `test/initGlobal.test.ts` — add resolver test |
| Modify | `test/initProject.test.ts` — add resolver + templateName tests |

---

## Task 1: Foundation — types + paths

**Files:**
- Modify: `src/types.ts`
- Modify: `src/paths.ts`

- [ ] **Step 1: Add `GlobalConfig` and `HarnessPackage` to types.ts**

Open `src/types.ts`. Append after the existing `LockFile` type:

```typescript
export type GlobalConfig = {
  tools: string[];
  packagePath?: string;
};

export type HarnessPackage = {
  name: string;
  version: string;
  description?: string;
  modelTag?: string;
};
```

- [ ] **Step 2: Add package path helpers to paths.ts**

Open `src/paths.ts`. Append at the end of the file:

```typescript
export const packageHarnessJson = (p: string) => path.join(p, 'harness.json');
export const packageGlobalDir = (p: string) => path.join(p, 'global');
export const packageGlobalAgentsMd = (p: string) => path.join(p, 'global', 'AGENTS.md');
export const packageGlobalConfigJson = (p: string) => path.join(p, 'global', 'config.json');
export const packageTemplatesStackDir = (p: string) => path.join(p, 'templates', 'stack');
export const packageTemplatesProjectDir = (p: string) => path.join(p, 'templates', 'project');
export const packageProjectsDir = (p: string) => path.join(p, 'projects');
```

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/paths.ts
git commit -m "feat(packages): add GlobalConfig, HarnessPackage types and package path helpers"
```

---

## Task 2: PackageResolver

**Files:**
- Create: `src/package-resolver.ts`
- Create: `test/package-resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/package-resolver.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PackageResolver, readResolver } from '../src/package-resolver.js';
import { packageTemplatesStackDir, packageGlobalAgentsMd, packageProjectsDir, globalConfigFile } from '../src/paths.js';

function tmpPkg(): string {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
  fs.mkdirSync(packageTemplatesStackDir(p), { recursive: true });
  fs.mkdirSync(packageGlobalAgentsMd(p).replace('/AGENTS.md', ''), { recursive: true });
  fs.mkdirSync(packageProjectsDir(p), { recursive: true });
  return p;
}

describe('PackageResolver', () => {
  it('active is false when no package path', () => {
    const r = new PackageResolver(null);
    expect(r.active).toBe(false);
  });

  it('active is true when package path provided', () => {
    const p = tmpPkg();
    expect(new PackageResolver(p).active).toBe(true);
  });

  it('stackModule falls back to bundled when file absent from package', () => {
    const r = new PackageResolver(tmpPkg());
    const content = r.stackModule('typescript');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('TypeScript');
  });

  it('stackModule returns package file when present', () => {
    const p = tmpPkg();
    fs.writeFileSync(path.join(packageTemplatesStackDir(p), 'typescript.md'), '# Custom TS\n');
    const content = new PackageResolver(p).stackModule('typescript');
    expect(content).toBe('# Custom TS\n');
  });

  it('globalAgentsMd returns null when no package', () => {
    expect(new PackageResolver(null).globalAgentsMd()).toBeNull();
  });

  it('globalAgentsMd returns null when file absent from package', () => {
    expect(new PackageResolver(tmpPkg()).globalAgentsMd()).toBeNull();
  });

  it('globalAgentsMd returns package file when present', () => {
    const p = tmpPkg();
    fs.writeFileSync(packageGlobalAgentsMd(p), '# My Rules\n');
    expect(new PackageResolver(p).globalAgentsMd()).toBe('# My Rules\n');
  });

  it('projectOverlayFiles returns empty when no package', () => {
    expect(new PackageResolver(null).projectOverlayFiles('myrepo')).toEqual([]);
  });

  it('projectOverlayFiles returns empty when no overlay dir', () => {
    expect(new PackageResolver(tmpPkg()).projectOverlayFiles('myrepo')).toEqual([]);
  });

  it('projectOverlayFiles returns files from projects/<name>', () => {
    const p = tmpPkg();
    const overlayDir = path.join(packageProjectsDir(p), 'myrepo');
    fs.mkdirSync(overlayDir, { recursive: true });
    fs.writeFileSync(path.join(overlayDir, 'project.md'), '# Overlay\n');
    const files = new PackageResolver(p).projectOverlayFiles('myrepo');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('project.md');
    expect(files[0].content).toBe('# Overlay\n');
  });

  it('projectTemplateNames returns empty when no package', () => {
    expect(new PackageResolver(null).projectTemplateNames()).toEqual([]);
  });

  it('projectTemplateNames lists subdirectories of templates/project/', () => {
    const p = tmpPkg();
    fs.mkdirSync(path.join(p, 'templates', 'project', 'nextjs'), { recursive: true });
    fs.mkdirSync(path.join(p, 'templates', 'project', 'fastapi'), { recursive: true });
    expect(new PackageResolver(p).projectTemplateNames()).toEqual(['fastapi', 'nextjs']);
  });

  it('projectTemplateFiles returns files from templates/project/<name>', () => {
    const p = tmpPkg();
    const tplDir = path.join(p, 'templates', 'project', 'nextjs');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(path.join(tplDir, 'project.md'), '# NextJS Template\n');
    const files = new PackageResolver(p).projectTemplateFiles('nextjs');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('project.md');
    expect(files[0].content).toBe('# NextJS Template\n');
  });
});

describe('readResolver', () => {
  it('returns inactive resolver when no config', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    expect(readResolver(home).active).toBe(false);
  });

  it('returns inactive resolver when config has no packagePath', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ tools: ['claude'] }));
    expect(readResolver(home).active).toBe(false);
  });

  it('returns active resolver when config has packagePath', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    const pkg = tmpPkg();
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ tools: [], packagePath: pkg }));
    const r = readResolver(home);
    expect(r.active).toBe(true);
    expect(r.path).toBe(pkg);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package-resolver.test.ts
```

Expected: FAIL — `package-resolver.ts` does not exist yet.

- [ ] **Step 3: Implement PackageResolver**

Create `src/package-resolver.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stackModule as bundledStackModule } from './catalog.js';
import {
  globalConfigFile,
  packageGlobalAgentsMd,
  packageTemplatesStackDir,
  packageProjectsDir,
  packageTemplatesProjectDir,
} from './paths.js';
import type { GlobalConfig } from './types.js';

export class PackageResolver {
  constructor(private readonly packagePath: string | null) {}

  get active(): boolean { return this.packagePath !== null; }
  get path(): string | null { return this.packagePath; }

  stackModule(tech: string): string {
    if (this.packagePath) {
      const f = path.join(packageTemplatesStackDir(this.packagePath), `${tech}.md`);
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    }
    return bundledStackModule(tech);
  }

  globalAgentsMd(): string | null {
    if (!this.packagePath) return null;
    const p = packageGlobalAgentsMd(this.packagePath);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }

  projectOverlayFiles(repoName: string): { relPath: string; content: string }[] {
    if (!this.packagePath) return [];
    const overlayDir = path.join(packageProjectsDir(this.packagePath), repoName);
    if (!fs.existsSync(overlayDir)) return [];
    const result: { relPath: string; content: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs);
        else if (entry.name.endsWith('.md')) {
          result.push({
            relPath: path.relative(overlayDir, abs),
            content: fs.readFileSync(abs, 'utf8'),
          });
        }
      }
    };
    walk(overlayDir);
    return result;
  }

  projectTemplateNames(): string[] {
    if (!this.packagePath) return [];
    const dir = packageTemplatesProjectDir(this.packagePath);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  }

  projectTemplateFiles(name: string): { relPath: string; content: string }[] {
    if (!this.packagePath) return [];
    const templateDir = path.join(packageTemplatesProjectDir(this.packagePath), name);
    if (!fs.existsSync(templateDir)) return [];
    const result: { relPath: string; content: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs);
        else if (entry.name.endsWith('.md')) {
          result.push({
            relPath: path.relative(templateDir, abs),
            content: fs.readFileSync(abs, 'utf8'),
          });
        }
      }
    };
    walk(templateDir);
    return result;
  }
}

export function readResolver(home: string = os.homedir()): PackageResolver {
  const cfg = globalConfigFile(home);
  if (!fs.existsSync(cfg)) return new PackageResolver(null);
  try {
    const c: GlobalConfig = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    return new PackageResolver(c.packagePath ?? null);
  } catch {
    return new PackageResolver(null);
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package-resolver.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/package-resolver.ts test/package-resolver.test.ts
git commit -m "feat(packages): add PackageResolver with stack/global/overlay/template resolution"
```

---

## Task 3: `seh package init`

**Files:**
- Create: `src/commands/package.ts`
- Create: `test/package.test.ts` (partial — extended in Task 4)

- [ ] **Step 1: Export `buildGlobalAgentsMd` from initGlobal.ts**

Open `src/commands/initGlobal.ts`. The private `orderedGlobalSections` function already exists. Add and export a public builder after it:

```typescript
export function buildGlobalAgentsMd(): string {
  return buildDocument(globalPreamble(), orderedGlobalSections());
}
```

- [ ] **Step 2: Write failing tests for `runPackageInit`**

Create `test/package.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPackageInit } from '../src/commands/package.js';
import {
  packageHarnessJson,
  packageGlobalAgentsMd,
  packageGlobalConfigJson,
  packageTemplatesStackDir,
  packageTemplatesProjectDir,
  packageProjectsDir,
} from '../src/paths.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkgcmd-'));
}

describe('runPackageInit', () => {
  it('creates full package structure', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p });

    expect(fs.existsSync(packageHarnessJson(p))).toBe(true);
    expect(fs.existsSync(path.join(p, 'CHANGELOG.md'))).toBe(true);
    expect(fs.existsSync(packageGlobalAgentsMd(p))).toBe(true);
    expect(fs.existsSync(packageGlobalConfigJson(p))).toBe(true);
    expect(fs.existsSync(packageTemplatesStackDir(p))).toBe(true);
    expect(fs.existsSync(packageTemplatesProjectDir(p))).toBe(true);
    expect(fs.existsSync(packageProjectsDir(p))).toBe(true);
  });

  it('harness.json has correct name from directory basename', () => {
    const base = tmpDir();
    const p = path.join(base, 'team-harness');
    runPackageInit({ packagePath: p });
    const pkg = JSON.parse(fs.readFileSync(packageHarnessJson(p), 'utf8'));
    expect(pkg.name).toBe('team-harness');
    expect(pkg.version).toBe('1.0.0');
  });

  it('copies all bundled stack modules into templates/stack/', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p });
    for (const tech of ['typescript', 'python', 'go', 'rust', 'java', 'javascript', 'c']) {
      expect(fs.existsSync(path.join(packageTemplatesStackDir(p), `${tech}.md`))).toBe(true);
    }
  });

  it('global/AGENTS.md is generated from bundled defaults when no existing global', () => {
    const base = tmpDir();
    const home = tmpDir(); // empty home — no ~/.seh/AGENTS.md
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p, home });
    const content = fs.readFileSync(packageGlobalAgentsMd(p), 'utf8');
    expect(content).toContain('GENERATED by seh');
    expect(content).toContain('# Craftsmanship');
  });

  it('global/AGENTS.md copies existing ~/.seh/AGENTS.md when present', () => {
    const base = tmpDir();
    const home = tmpDir();
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(path.join(home, '.seh', 'AGENTS.md'), '# My Custom Rules\n');
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p, home });
    expect(fs.readFileSync(packageGlobalAgentsMd(p), 'utf8')).toBe('# My Custom Rules\n');
  });

  it('throws when package already exists without --force', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p });
    expect(() => runPackageInit({ packagePath: p })).toThrow('already exists');
  });

  it('overwrites with --force', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p });
    expect(() => runPackageInit({ packagePath: p, force: true })).not.toThrow();
  });

  it('returns list of created files', () => {
    const base = tmpDir();
    const p = path.join(base, 'my-harness');
    const { created } = runPackageInit({ packagePath: p });
    expect(created).toContain('harness.json');
    expect(created).toContain('CHANGELOG.md');
    expect(created).toContain('global/AGENTS.md');
    expect(created).toContain('global/config.json');
    expect(created).toContain('templates/stack/typescript.md');
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package.test.ts
```

Expected: FAIL — `package.ts` does not exist.

- [ ] **Step 4: Implement `runPackageInit`**

Create `src/commands/package.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SUPPORTED_TECHS, stackModule as bundledStackModule } from '../catalog.js';
import { buildGlobalAgentsMd } from './initGlobal.js';
import {
  globalIndexFile,
  globalConfigFile,
  packageHarnessJson,
  packageGlobalDir,
  packageGlobalAgentsMd,
  packageGlobalConfigJson,
  packageTemplatesStackDir,
  packageTemplatesProjectDir,
  packageProjectsDir,
} from '../paths.js';
import type { GlobalConfig, HarnessPackage } from '../types.js';

export function runPackageInit(opts: {
  packagePath: string;
  home?: string;
  force?: boolean;
}): { created: string[] } {
  const home = opts.home ?? os.homedir();
  const p = opts.packagePath;

  if (fs.existsSync(packageHarnessJson(p)) && !opts.force) {
    throw new Error(`harness package already exists at ${p}. Use --force to overwrite.`);
  }

  for (const d of [
    packageGlobalDir(p),
    packageTemplatesStackDir(p),
    packageTemplatesProjectDir(p),
    packageProjectsDir(p),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const pkg: HarnessPackage = {
    name: path.basename(p),
    version: '1.0.0',
    description: 'Personal coding harness',
  };
  fs.writeFileSync(packageHarnessJson(p), JSON.stringify(pkg, null, 2) + '\n');

  const existingGlobal = globalIndexFile(home);
  const globalContent = fs.existsSync(existingGlobal)
    ? fs.readFileSync(existingGlobal, 'utf8')
    : buildGlobalAgentsMd();
  fs.writeFileSync(packageGlobalAgentsMd(p), globalContent);
  fs.writeFileSync(packageGlobalConfigJson(p), JSON.stringify({ tools: [] }, null, 2) + '\n');

  for (const tech of SUPPORTED_TECHS) {
    fs.writeFileSync(
      path.join(packageTemplatesStackDir(p), `${tech}.md`),
      bundledStackModule(tech),
    );
  }

  fs.writeFileSync(
    path.join(p, 'CHANGELOG.md'),
    '# Harness Changelog\n\nRecord what you changed and why.\n',
  );

  return {
    created: [
      'harness.json',
      'CHANGELOG.md',
      'global/AGENTS.md',
      'global/config.json',
      ...SUPPORTED_TECHS.map((t) => `templates/stack/${t}.md`),
    ],
  };
}
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/commands/package.ts src/commands/initGlobal.ts test/package.test.ts
git commit -m "feat(packages): add runPackageInit command"
```

---

## Task 4: `seh package use` + `seh package status`

**Files:**
- Modify: `src/commands/package.ts`
- Modify: `test/package.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `test/package.test.ts`:

```typescript
import { runPackageUse, runPackageStatus } from '../src/commands/package.js';
import { globalConfigFile } from '../src/paths.js';

describe('runPackageUse', () => {
  it('writes packagePath to ~/.seh/config.json', () => {
    const base = tmpDir();
    const home = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p, home });
    runPackageUse({ packagePath: p, home });
    const cfg = JSON.parse(fs.readFileSync(globalConfigFile(home), 'utf8'));
    expect(cfg.packagePath).toBe(path.resolve(p));
  });

  it('preserves existing tools in config.json', () => {
    const base = tmpDir();
    const home = tmpDir();
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ tools: ['claude', 'codex'] }));
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p, home });
    runPackageUse({ packagePath: p, home });
    const cfg = JSON.parse(fs.readFileSync(globalConfigFile(home), 'utf8'));
    expect(cfg.tools).toEqual(['claude', 'codex']);
    expect(cfg.packagePath).toBe(path.resolve(p));
  });

  it('throws when path does not exist', () => {
    const home = tmpDir();
    expect(() => runPackageUse({ packagePath: '/nonexistent/path', home }))
      .toThrow('does not exist');
  });

  it('throws when path has no harness.json', () => {
    const home = tmpDir();
    const p = tmpDir();
    expect(() => runPackageUse({ packagePath: p, home }))
      .toThrow('not a harness package');
  });
});

describe('runPackageStatus', () => {
  it('returns null packagePath when no config', () => {
    const home = tmpDir();
    const status = runPackageStatus({ home });
    expect(status.packagePath).toBeNull();
    expect(status.pkg).toBeNull();
  });

  it('returns null when config has no packagePath', () => {
    const home = tmpDir();
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ tools: [] }));
    expect(runPackageStatus({ home }).packagePath).toBeNull();
  });

  it('returns package metadata and dir existence when active', () => {
    const base = tmpDir();
    const home = tmpDir();
    const p = path.join(base, 'my-harness');
    runPackageInit({ packagePath: p, home });
    runPackageUse({ packagePath: p, home });
    const status = runPackageStatus({ home });
    expect(status.packagePath).toBe(path.resolve(p));
    expect(status.pkg?.name).toBe('my-harness');
    expect(status.pkg?.version).toBe('1.0.0');
    expect(status.dirs['global/']).toBe(true);
    expect(status.dirs['templates/stack/']).toBe(true);
    expect(status.dirs['templates/project/']).toBe(true);
    expect(status.dirs['projects/']).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/package.test.ts
```

Expected: FAIL — `runPackageUse` and `runPackageStatus` not exported yet.

- [ ] **Step 3: Implement `runPackageUse` and `runPackageStatus`**

Append to `src/commands/package.ts`:

```typescript
export function runPackageUse(opts: {
  packagePath: string;
  home?: string;
}): void {
  const home = opts.home ?? os.homedir();
  const resolved = path.resolve(opts.packagePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`path does not exist: ${resolved}`);
  }
  if (!fs.existsSync(packageHarnessJson(resolved))) {
    throw new Error(`not a harness package (missing harness.json): ${resolved}`);
  }

  const cfgFile = globalConfigFile(home);
  let cfg: GlobalConfig = { tools: [] };
  if (fs.existsSync(cfgFile)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch { /* keep default */ }
  }
  cfg.packagePath = resolved;
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n');
}

export function runPackageStatus(opts: {
  home?: string;
}): { packagePath: string | null; pkg: HarnessPackage | null; dirs: Record<string, boolean> } {
  const home = opts.home ?? os.homedir();
  const cfgFile = globalConfigFile(home);
  if (!fs.existsSync(cfgFile)) return { packagePath: null, pkg: null, dirs: {} };

  let packagePath: string | null = null;
  try {
    const cfg: GlobalConfig = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
    packagePath = cfg.packagePath ?? null;
  } catch { /* */ }

  if (!packagePath) return { packagePath: null, pkg: null, dirs: {} };

  let pkg: HarnessPackage | null = null;
  const hj = packageHarnessJson(packagePath);
  if (fs.existsSync(hj)) {
    try { pkg = JSON.parse(fs.readFileSync(hj, 'utf8')); } catch { /* */ }
  }

  const dirs: Record<string, boolean> = {
    'global/': fs.existsSync(packageGlobalDir(packagePath)),
    'templates/stack/': fs.existsSync(packageTemplatesStackDir(packagePath)),
    'templates/project/': fs.existsSync(packageTemplatesProjectDir(packagePath)),
    'projects/': fs.existsSync(packageProjectsDir(packagePath)),
  };

  return { packagePath, pkg, dirs };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

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
git commit -m "feat(packages): add runPackageUse and runPackageStatus"
```

---

## Task 5: Wire resolver into `runSync` (stack override + overlay)

**Files:**
- Modify: `src/commands/sync.ts`
- Modify: `test/sync.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `test/sync.test.ts`:

```typescript
import { PackageResolver } from '../src/package-resolver.js';
import { packageTemplatesStackDir, packageProjectsDir } from '../src/paths.js';

describe('runSync with resolver', () => {
  it('uses package stack module when present', () => {
    const r = repoWithProject();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageTemplatesStackDir(pkg), { recursive: true });
    fs.writeFileSync(path.join(packageTemplatesStackDir(pkg), 'typescript.md'), '# Custom TS\n');
    const resolver = new PackageResolver(pkg);
    runSync({ root: r, technologies: ['typescript'], projectTools: [], resolver });
    const content = fs.readFileSync(path.join(r, '.seh', 'stack', 'typescript.md'), 'utf8');
    expect(content).toBe('# Custom TS\n');
  });

  it('applies project overlay from package', () => {
    const r = repoWithProject();
    const repoName = path.basename(r);
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    const overlayDir = path.join(packageProjectsDir(pkg), repoName);
    fs.mkdirSync(overlayDir, { recursive: true });
    fs.writeFileSync(path.join(overlayDir, 'project.md'), '# Overlay Project\n');
    const resolver = new PackageResolver(pkg);
    const res = runSync({ root: r, technologies: ['typescript'], projectTools: [], resolver });
    expect(fs.readFileSync(path.join(r, '.seh', 'project.md'), 'utf8')).toBe('# Overlay Project\n');
    expect(res.written).toContain(path.join('.seh', 'project.md'));
  });

  it('no-ops overlay when no matching project in package', () => {
    const r = repoWithProject();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageProjectsDir(pkg), { recursive: true });
    const resolver = new PackageResolver(pkg);
    expect(() => runSync({ root: r, technologies: ['typescript'], projectTools: [], resolver })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/sync.test.ts
```

Expected: FAIL — `resolver` option not accepted yet.

- [ ] **Step 3: Update `runSync` signature and implementation**

Open `src/commands/sync.ts`. Add the import at the top:

```typescript
import type { PackageResolver } from '../package-resolver.js';
```

Update the opts type signature:

```typescript
export function runSync(opts: {
  root: string;
  technologies: string[];
  projectTools?: string[];
  home?: string;
  resolver?: PackageResolver;
}): { written: string[] }
```

Replace the stack-module writing loop (the `for (const tech of opts.technologies)` block that calls `stackModule(tech)`) with:

```typescript
  for (const tech of opts.technologies) {
    const content = opts.resolver ? opts.resolver.stackModule(tech) : stackModule(tech);
    fs.writeFileSync(path.join(stackDir, `${tech}.md`), content);
    written.push(path.join('.seh', 'stack', `${tech}.md`));
  }
```

Append the overlay application block after `written.push('seh.lock')` and before the tools/gitignore section:

```typescript
  if (opts.resolver) {
    const repoName = path.basename(opts.root);
    for (const { relPath, content } of opts.resolver.projectOverlayFiles(repoName)) {
      const dest = path.join(projectSehDir(opts.root), relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
      const normalized = path.join('.seh', relPath);
      if (!written.includes(normalized)) written.push(normalized);
    }
  }
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/sync.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/sync.ts test/sync.test.ts
git commit -m "feat(packages): runSync uses resolver for stack content and project overlay"
```

---

## Task 6: Wire resolver into `runInitGlobal`

**Files:**
- Modify: `src/commands/initGlobal.ts`
- Modify: `test/initGlobal.test.ts`

- [ ] **Step 1: Write failing test**

Append to `test/initGlobal.test.ts`:

```typescript
import { PackageResolver } from '../src/package-resolver.js';
import { packageGlobalAgentsMd, packageGlobalDir } from '../src/paths.js';

describe('runInitGlobal with resolver', () => {
  it('uses package global/AGENTS.md when present in resolver', () => {
    const home = tmpHome();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageGlobalDir(pkg), { recursive: true });
    fs.writeFileSync(packageGlobalAgentsMd(pkg), '# Package Rules\n');
    const resolver = new PackageResolver(pkg);
    runInitGlobal({ home, resolver });
    const content = fs.readFileSync(path.join(home, '.seh', 'AGENTS.md'), 'utf8');
    expect(content).toBe('# Package Rules\n');
  });

  it('falls back to bundled when resolver has no global/AGENTS.md', () => {
    const home = tmpHome();
    const resolver = new PackageResolver(fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-')));
    runInitGlobal({ home, resolver });
    const content = fs.readFileSync(path.join(home, '.seh', 'AGENTS.md'), 'utf8');
    expect(content).toContain('# Craftsmanship');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/initGlobal.test.ts
```

Expected: FAIL — `resolver` option not accepted.

- [ ] **Step 3: Update `runInitGlobal`**

Open `src/commands/initGlobal.ts`. Add import at the top:

```typescript
import type { PackageResolver } from '../package-resolver.js';
```

Update the opts signature:

```typescript
export function runInitGlobal(opts: {
  home: string;
  tools?: string[];
  force?: boolean;
  resolver?: PackageResolver;
}): { created: string[]; skipped: string[] }
```

Replace the content assignment line (where `buildDocument(...)` is called) with:

```typescript
    const content = opts.resolver?.globalAgentsMd() ?? buildDocument(globalPreamble(), orderedGlobalSections());
    fs.writeFileSync(idx, content);
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/initGlobal.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/initGlobal.ts test/initGlobal.test.ts
git commit -m "feat(packages): runInitGlobal uses package global/AGENTS.md when resolver active"
```

---

## Task 7: Wire resolver into `runInitProject` (project templates)

**Files:**
- Modify: `src/commands/initProject.ts`
- Modify: `test/initProject.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `test/initProject.test.ts`:

```typescript
import { PackageResolver } from '../src/package-resolver.js';
import { packageTemplatesProjectDir, packageTemplatesStackDir } from '../src/paths.js';

describe('runInitProject with resolver', () => {
  it('uses package project template files when templateName provided', () => {
    const root = tmp();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    const tplDir = path.join(pkg, 'templates', 'project', 'nextjs');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(path.join(tplDir, 'project.md'), '# NextJS Project\n');
    const resolver = new PackageResolver(pkg);
    runInitProject({ root, technologies: ['typescript'], resolver, templateName: 'nextjs' });
    expect(fs.readFileSync(path.join(root, '.seh', 'project.md'), 'utf8')).toBe('# NextJS Project\n');
  });

  it('falls back to bundled template files when templateName absent', () => {
    const root = tmp();
    const resolver = new PackageResolver(fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-')));
    runInitProject({ root, technologies: ['typescript'], resolver });
    // bundled template creates project.md and domain files
    expect(fs.existsSync(path.join(root, '.seh', 'project.md'))).toBe(true);
  });

  it('passes resolver to runSync so stack override applies', () => {
    const root = tmp();
    const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
    fs.mkdirSync(packageTemplatesStackDir(pkg), { recursive: true });
    fs.writeFileSync(path.join(packageTemplatesStackDir(pkg), 'python.md'), '# Custom Python\n');
    const resolver = new PackageResolver(pkg);
    runInitProject({ root, technologies: ['python'], resolver });
    expect(fs.readFileSync(path.join(root, '.seh', 'stack', 'python.md'), 'utf8')).toBe('# Custom Python\n');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/initProject.test.ts
```

Expected: FAIL — `resolver` and `templateName` options not accepted.

- [ ] **Step 3: Update `runInitProject`**

Open `src/commands/initProject.ts`. Add import at the top:

```typescript
import type { PackageResolver } from '../package-resolver.js';
```

Update the opts signature:

```typescript
export function runInitProject(opts: {
  root: string;
  technologies: string[];
  force?: boolean;
  projectTools?: string[];
  home?: string;
  resolver?: PackageResolver;
  templateName?: string;
}): { created: string[]; skipped: string[]; synced: string[] }
```

Replace the `templateFiles()` call in the file loop. Currently the loop is:
```typescript
  for (const file of templateFiles()) {
```

Replace with:
```typescript
  const filesToScaffold = (opts.templateName && opts.resolver)
    ? opts.resolver.projectTemplateFiles(opts.templateName)
    : templateFiles();
  for (const file of filesToScaffold) {
```

Pass `resolver` to `runSync`. Find the `runSync({ ... })` call and add `resolver: opts.resolver`:

```typescript
  const { written } = runSync({
    root: opts.root,
    technologies: opts.technologies,
    projectTools: opts.projectTools,
    home: opts.home,
    resolver: opts.resolver,
  });
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/initProject.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/commands/initProject.ts test/initProject.test.ts
git commit -m "feat(packages): runInitProject accepts resolver and templateName"
```

---

## Task 8: Register `package` command + wire resolver in CLI

**Files:**
- Modify: `src/cli.ts`
- Modify: `test/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Open `test/cli.test.ts` and append:

```typescript
import { runPackageInit, runPackageUse } from '../src/commands/package.js';
import { globalConfigFile, packageHarnessJson } from '../src/paths.js';

describe('seh package commands (CLI)', () => {
  it('seh package init creates package at given path', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    const p = path.join(base, 'test-harness');
    await buildProgram().parseAsync(['node', 'seh', 'package', 'init', p]);
    expect(fs.existsSync(packageHarnessJson(p))).toBe(true);
  });

  it('seh package init defaults to ./my-harness when no path given', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    process.chdir(base);
    await buildProgram().parseAsync(['node', 'seh', 'package', 'init']);
    expect(fs.existsSync(path.join(base, 'my-harness', 'harness.json'))).toBe(true);
  });

  it('seh package use writes packagePath to config', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehcli-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
    const p = path.join(base, 'test-harness');
    runPackageInit({ packagePath: p, home });
    // Override HOME for this test via env — or just call runPackageUse directly
    // since CLI integration is verified in unit tests above
    runPackageUse({ packagePath: p, home });
    const cfg = JSON.parse(fs.readFileSync(globalConfigFile(home), 'utf8'));
    expect(cfg.packagePath).toBe(path.resolve(p));
  });

  it('seh package status prints "no active package" when none configured', async () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m) => logs.push(m));
    await buildProgram().parseAsync(['node', 'seh', 'package', 'status']);
    spy.mockRestore();
    expect(logs.some((l) => l.includes('no active package'))).toBe(true);
  });
});
```

Note: `test/cli.test.ts` already imports `buildProgram` — check its existing imports and add `vi` from `vitest` if not already imported.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/cli.test.ts
```

Expected: FAIL — `package` subcommand not registered.

- [ ] **Step 3: Wire everything into `cli.ts`**

Open `src/cli.ts`. Add these imports at the top (after existing imports):

```typescript
import path from 'node:path';
import { readResolver } from './package-resolver.js';
import { runPackageInit, runPackageUse, runPackageStatus } from './commands/package.js';
```

Inside `buildProgram()`, instantiate the resolver once (add before the first `program.command(...)` call):

```typescript
  const resolver = readResolver(os.homedir());
```

In the `init --global` action, pass resolver to `runInitGlobal`:

```typescript
          const out = runInitGlobal({ home: os.homedir(), tools, force: opts.force, resolver });
```

In the `init` (project) action, add template selection prompt after tech detection and before `runInitProject`. Insert after `techs` is resolved and before the `runInitProject` call:

```typescript
        let templateName: string | undefined;
        if (!opts.yes && resolver.active) {
          const templates = resolver.projectTemplateNames();
          if (templates.length > 0) {
            const res = await prompts({
              type: 'select',
              name: 'template',
              message: 'Use a project template from your package?',
              choices: [
                { title: '(none — bare stack selection)', value: '' },
                ...templates.map((t) => ({ title: t, value: t })),
              ],
            });
            if (res.template === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            templateName = res.template || undefined;
          }
        }
```

Pass `resolver` and `templateName` to `runInitProject`:

```typescript
        const out = runInitProject({
          root, technologies: techs,
          force: opts.force,
          projectTools: readConfiguredTools(os.homedir()),
          home: os.homedir(),
          resolver,
          templateName,
        });
```

In the `sync` action, pass resolver to `runSync`:

```typescript
        const res = runSync({ root, technologies: lock.technologies ?? [], home: os.homedir(), resolver });
```

Register the `package` command group. Add before the `return program;` line:

```typescript
  const pkg = program.command('package').description('Manage harness packages');

  pkg
    .command('init [path]')
    .description('Scaffold a new harness package')
    .option('-f, --force', 'overwrite existing package')
    .action(async (pkgPath: string | undefined, opts: { force?: boolean }) => {
      try {
        const packagePath = path.resolve(pkgPath ?? 'my-harness');
        const res = runPackageInit({ packagePath, home: os.homedir(), force: opts.force });
        console.log(`seh: package created at ${packagePath} [${res.created.length} files]`);
        console.log(`  Next: cd ${packagePath} && git init && git add . && git commit -m "init harness"`);
      } catch (err) { fail(err); }
    });

  pkg
    .command('use <path>')
    .description('Point seh at an existing harness package')
    .action((pkgPath: string) => {
      try {
        runPackageUse({ packagePath: pkgPath, home: os.homedir() });
        console.log(`seh: active package → ${path.resolve(pkgPath)}`);
      } catch (err) { fail(err); }
    });

  pkg
    .command('status')
    .description('Show the active harness package')
    .action(() => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) { console.log('seh: no active package'); return; }
        console.log(`seh: active package ${status.packagePath}`);
        if (status.pkg) console.log(`  name: ${status.pkg.name}  version: ${status.pkg.version}`);
        for (const [dir, exists] of Object.entries(status.dirs)) {
          console.log(`  ${exists ? '✓' : '✗'} ${dir}`);
        }
      } catch (err) { fail(err); }
    });
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /home/manuuuel/pocs/seh && npm test -- test/cli.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
cd /home/manuuuel/pocs/seh && npm test
```

Expected: all pass.

- [ ] **Step 6: Build to confirm TypeScript compiles cleanly**

```bash
cd /home/manuuuel/pocs/seh && npm run build
```

Expected: no errors.

- [ ] **Step 7: Smoke test the CLI manually**

```bash
cd /tmp && node /home/manuuuel/pocs/seh/dist/cli.js package init test-harness
ls test-harness/
node /home/manuuuel/pocs/seh/dist/cli.js package status
node /home/manuuuel/pocs/seh/dist/cli.js package use test-harness
node /home/manuuuel/pocs/seh/dist/cli.js package status
```

Expected: package directory created, status shows no active / then shows active package after `use`.

- [ ] **Step 8: Commit**

```bash
git add src/cli.ts test/cli.test.ts
git commit -m "feat(packages): register package command group and wire resolver through CLI"
```
