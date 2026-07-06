// test/e2e.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitGlobal } from '../src/commands/initGlobal.js';
import { runInitProject } from '../src/commands/initProject.js';
import { runCheck } from '../src/commands/check.js';
import { linkAgent, isLinked } from '../src/links.js';

describe('e2e v2', () => {
  it('global init writes one unified file; project init syncs with no drift', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eH-'));
    runInitGlobal({ home, agents: [] });
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

  it('wires global and project symlinks for a multi-tool selection', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eH-'));
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sehe2eP-'));

    // 1) global init with several tools
    runInitGlobal({ home, agents: ['claude','codex','pi','gemini','opencode','copilot'] });
    for (const t of ['claude','codex','pi','gemini','opencode','copilot']) linkAgent('global', t, home);
    // all six tools now have a global target and resolve
    expect(isLinked('global','codex',home)).toBe(true);
    expect(isLinked('global','gemini',home)).toBe(true);
    expect(isLinked('global','copilot',home)).toBe(true);

    // 2) project init resolves project symlinks from config tools
    runInitProject({ root: repo, technologies: ['typescript'], projectAgents: ['codex','gemini','copilot'], home });
    expect(fs.realpathSync(path.join(repo,'AGENTS.md'))).toBe(fs.realpathSync(path.join(repo,'.seh','AGENTS.md')));
    expect(fs.realpathSync(path.join(repo,'GEMINI.md'))).toBe(fs.realpathSync(path.join(repo,'.seh','AGENTS.md')));
    expect(fs.realpathSync(path.join(repo,'.github','copilot-instructions.md'))).toBe(fs.realpathSync(path.join(repo,'.seh','AGENTS.md')));
  });
});
