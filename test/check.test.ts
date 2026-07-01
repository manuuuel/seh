// test/check.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { runCheck } from '../src/commands/check.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'seh-')); }

describe('runCheck', () => {
  let root: string;
  beforeEach(() => {
    root = tmp();
    fs.mkdirSync(path.join(root, '.harness'), { recursive: true });
    fs.writeFileSync(path.join(root, '.harness', 'project.md'), '# Project\nMISSION');
  });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('reports ok right after sync', () => {
    runSync({ root, adapters: ['claude'] });
    expect(runCheck({ root, adapters: ['claude'] }).ok).toBe(true);
  });

  it('detects missing generated file', () => {
    const res = runCheck({ root, adapters: ['claude'] });
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('CLAUDE.md');
  });

  it('detects drift after a source edit', () => {
    runSync({ root, adapters: ['claude'] });
    fs.writeFileSync(path.join(root, '.harness', 'project.md'), '# Project\nCHANGED');
    const res = runCheck({ root, adapters: ['claude'] });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('CLAUDE.md');
  });
});
