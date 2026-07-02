// test/e2e.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitGlobal } from '../src/commands/initGlobal.js';
import { runInitProject } from '../src/commands/initProject.js';
import { runCheck } from '../src/commands/check.js';

describe('e2e v2', () => {
  it('global init writes one unified file; project init syncs with no drift', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eH-'));
    runInitGlobal({ home, tools: [] });
    const gc = fs.readFileSync(path.join(home, '.seh', 'AGENTS.md'), 'utf8');
    expect(gc).toContain('# Craftsmanship');
    expect(gc).toContain('# Security');
    expect(gc).not.toContain('## Contents');
    expect(fs.existsSync(path.join(home, '.seh', 'global'))).toBe(false);

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eP-'));
    runInitProject({ root, technologies: ['typescript', 'python'] });
    expect(fs.existsSync(path.join(root, '.seh', 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'stack', 'python.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'stack', 'typescript.md'))).toBe(true);
    expect(runCheck({ root }).ok).toBe(true);
  });
});
