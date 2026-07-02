// test/initProject.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitProject } from '../src/commands/initProject.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehip-')); }

describe('runInitProject (v2)', () => {
  let root: string;
  beforeEach(() => { root = tmp(); });

  it('scaffolds .seh and syncs selected technologies', () => {
    const res = runInitProject({ root, technologies: ['typescript'] });
    expect(fs.existsSync(path.join(root, '.seh', 'project.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'domain', 'glossary.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'stack', 'typescript.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'AGENTS.md'))).toBe(true);
    expect(res.synced).toContain('.seh/AGENTS.md');
  });

  it('rejects an empty selection', () => {
    expect(() => runInitProject({ root, technologies: [] }))
      .toThrow('Select at least one technology');
  });

  it('rejects an unknown technology', () => {
    expect(() => runInitProject({ root, technologies: ['cobol'] }))
      .toThrow('Unknown technology: cobol');
  });

  it('skips existing project files without force', () => {
    runInitProject({ root, technologies: ['go'] });
    const res = runInitProject({ root, technologies: ['go'] });
    expect(res.skipped).toContain('.seh/project.md');
  });
  it('creates project symlinks when projectTools provided', () => {
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehip-'));
    runInitProject({ root: r, technologies: ['typescript'], projectTools: ['codex'] });
    expect(fs.lstatSync(path.join(r, 'AGENTS.md')).isSymbolicLink()).toBe(true);
  });
});
