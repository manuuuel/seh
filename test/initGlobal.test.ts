// test/initGlobal.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInitGlobal } from '../src/commands/initGlobal.js';

function tmpHome() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-')); }

describe('runInitGlobal', () => {
  it('creates preferences.md and config.json', () => {
    const home = tmpHome();
    const res = runInitGlobal({ home });
    expect(fs.existsSync(path.join(home, '.se-harness', 'preferences.md'))).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.se-harness', 'config.json'), 'utf8'));
    expect(cfg.defaultAdapters).toEqual(['claude', 'agents']);
    expect(res.created).toContain('preferences.md');
    expect(res.created).toContain('config.json');
  });

  it('skips existing files without force', () => {
    const home = tmpHome();
    runInitGlobal({ home });
    const res = runInitGlobal({ home });
    expect(res.skipped).toContain('preferences.md');
    expect(res.skipped).toContain('config.json');
  });

  it('overwrites existing files with force: true', () => {
    const home = tmpHome();
    runInitGlobal({ home });
    const prefPath = path.join(home, '.se-harness', 'preferences.md');
    fs.writeFileSync(prefPath, 'STALE');
    const res = runInitGlobal({ home, force: true });
    const content = fs.readFileSync(prefPath, 'utf8');
    expect(content).not.toBe('STALE');
    expect(res.created).toContain('preferences.md');
  });
});
