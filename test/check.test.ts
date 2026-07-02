// test/check.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { runCheck } from '../src/commands/check.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehchk-')); }

describe('runCheck (v2)', () => {
  let root: string;
  beforeEach(() => {
    root = tmp();
    fs.mkdirSync(path.join(root, '.seh'), { recursive: true });
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Project\nMISSION');
  });

  it('ok right after sync', () => {
    runSync({ root, technologies: ['typescript'] });
    expect(runCheck({ root }).ok).toBe(true);
  });

  it('reports missing lock when never synced', () => {
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('seh.lock');
  });

  it('detects index drift after editing a source', () => {
    runSync({ root, technologies: ['typescript'] });
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Project\nCHANGED TITLE HERE');
    // title unchanged ('Project') so index identical; change the heading to force drift:
    fs.writeFileSync(path.join(root, '.seh', 'project.md'), '# Renamed\nX');
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('AGENTS.md');
  });

  it('detects stack module drift', () => {
    runSync({ root, technologies: ['go'] });
    fs.writeFileSync(path.join(root, '.seh', 'stack', 'go.md'), '# tampered');
    const res = runCheck({ root });
    expect(res.ok).toBe(false);
    expect(res.drift).toContain('.seh/stack/go.md');
  });
});
