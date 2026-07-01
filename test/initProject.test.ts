// test/initProject.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitProject } from '../src/commands/initProject.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehproj-')); }

describe('runInitProject', () => {
  let root: string;
  beforeEach(() => { root = tmp(); });

  it('scaffolds the four .harness files', () => {
    const res = runInitProject({ root });
    for (const f of ['project.md', 'architecture.md', 'stack.md', 'conventions.md']) {
      expect(fs.existsSync(path.join(root, '.harness', f))).toBe(true);
    }
    expect(res.created.length).toBe(4);
  });

  it('detects a node project', () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    const res = runInitProject({ root });
    expect(res.detected['package.json']).toBe(true);
    expect(res.detected['go.mod']).toBe(false);
  });

  it('skips existing files without force', () => {
    runInitProject({ root });
    const res = runInitProject({ root });
    expect(res.skipped).toContain('.harness/project.md');
  });
});
