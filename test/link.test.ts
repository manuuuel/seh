// test/link.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLink } from '../src/commands/link.js';
import { globalDir, globalIndexFile } from '../src/paths.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlk-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ tools: [] }));
  return h;
}

describe('runLink', () => {
  it('adds and persists a tool link', () => {
    const home = tmpHome();
    const res = runLink({ home, add: ['claude'] });
    expect(res.linked).toContain('claude');
    expect(res.tools).toContain('claude');
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.seh', 'config.json'), 'utf8'));
    expect(cfg.tools).toContain('claude');
  });
  it('removes a tool link and updates config', () => {
    const home = tmpHome();
    runLink({ home, add: ['claude'] });
    const res = runLink({ home, remove: ['claude'] });
    expect(res.unlinked).toContain('claude');
    expect(res.tools).not.toContain('claude');
  });
  it('throws on malformed config.json', () => {
    const home = tmpHome();
    fs.writeFileSync(path.join(home, '.seh', 'config.json'), 'not json');
    expect(() => runLink({ home, add: ['claude'] })).toThrow(/Malformed config.json/);
  });
});
