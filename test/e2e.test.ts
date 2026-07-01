// test/e2e.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitProject } from '../src/commands/initProject.js';
import { runSync } from '../src/commands/sync.js';
import { runCheck } from '../src/commands/check.js';

describe('e2e: init -> sync -> check', () => {
  const cleanupDirs: string[] = [];
  afterEach(() => {
    for (const dir of cleanupDirs) fs.rmSync(dir, { recursive: true, force: true });
    cleanupDirs.length = 0;
  });

  it('produces no drift', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2e-'));
    cleanupDirs.push(root);
    runInitProject({ root });
    runSync({ root, adapters: ['claude', 'agents'] });
    expect(fs.existsSync(path.join(root, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'AGENTS.md'))).toBe(true);
    expect(runCheck({ root, adapters: ['claude', 'agents'] }).ok).toBe(true);
  });
});
