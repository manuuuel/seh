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
  });

  it('skips existing files without force', () => {
    const home = tmpHome();
    runInitGlobal({ home });
    const res = runInitGlobal({ home });
    expect(res.skipped).toContain('preferences.md');
  });
});
