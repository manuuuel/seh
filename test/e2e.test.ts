// test/e2e.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitGlobal } from '../src/commands/initGlobal.js';
import { runInitProject } from '../src/commands/initProject.js';
import { runCheck } from '../src/commands/check.js';

describe('e2e v2', () => {
  it('global init writes a modular index; project init syncs with no drift', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eH-'));
    runInitGlobal({ home, tools: [] });
    expect(fs.existsSync(path.join(home, '.seh', 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.seh', 'global', 'security.md'))).toBe(true);

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eP-'));
    runInitProject({ root, technologies: ['typescript', 'python'] });
    expect(fs.existsSync(path.join(root, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.seh', 'stack', 'python.md'))).toBe(true);
    expect(runCheck({ root }).ok).toBe(true);
  });
});
