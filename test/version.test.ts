import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from '../src/version.js';
import { buildProgram } from '../src/cli.js';
import { runSync } from '../src/commands/sync.js';
import type { LockFile } from '../src/types.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const declared = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;

describe('version — single source of truth', () => {
  it('reads the version from package.json', () => {
    expect(version()).toBe(declared);
  });

  it('is what the CLI reports', () => {
    expect(buildProgram().version()).toBe(declared);
  });

  it('is what sync stamps into seh.lock', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehver-'));
    runSync({ root, technologies: ['typescript'] });
    const lock: LockFile = JSON.parse(fs.readFileSync(path.join(root, 'seh.lock'), 'utf8'));
    expect(lock.version).toBe(declared);
  });

  // Guards the bug this replaced: sync.ts carried its own `const VERSION`, which
  // silently fell behind package.json. Any second copy of the *current* version
  // is a constant someone must remember to bump in lockstep — the failure mode.
  // Scoped to the declared version so unrelated literals (e.g. the 1.0.0 a
  // scaffolded harness package starts at) don't trip it.
  it('is not duplicated as a literal anywhere in src', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts') && e.name !== 'version.ts') {
          if (fs.readFileSync(p, 'utf8').includes(`'${declared}'`)) {
            offenders.push(path.relative(repoRoot, p));
          }
        }
      }
    };
    walk(path.join(repoRoot, 'src'));
    expect(offenders).toEqual([]);
  });
});
