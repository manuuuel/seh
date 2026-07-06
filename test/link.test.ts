import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLink } from '../src/commands/link.js';
import { globalDir, globalIndexFile } from '../src/paths.js';
import { SUPPORTED_AGENTS } from '../src/links.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlk-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ agents: [] }));
  return h;
}

describe('runLink', () => {
  it('adds and persists an agent link', () => {
    const home = tmpHome();
    const res = runLink({ home, add: ['claude'] });
    expect(res.linked).toContain('claude');
    expect(res.agents).toContain('claude');
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.seh', 'config.json'), 'utf8'));
    expect(cfg.agents).toContain('claude');
  });
  it('removes an agent link and updates config', () => {
    const home = tmpHome();
    runLink({ home, add: ['claude'] });
    const res = runLink({ home, remove: ['claude'] });
    expect(res.unlinked).toContain('claude');
    expect(res.agents).not.toContain('claude');
  });
  it('throws on malformed config.json', () => {
    const home = tmpHome();
    fs.writeFileSync(path.join(home, '.seh', 'config.json'), 'not json');
    expect(() => runLink({ home, add: ['claude'] })).toThrow(/Malformed config.json/);
  });
  it('persists copilot in config even though it has no global link', () => {
    const home = tmpHome();
    const res = runLink({ home, add: ['copilot', 'codex'] });
    expect(res.agents).toEqual(expect.arrayContaining(['copilot', 'codex']));
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.seh', 'config.json'), 'utf8'));
    expect(cfg.agents).toEqual(expect.arrayContaining(['copilot', 'codex']));
  });
  it('rejects an unknown agent', () => {
    const home = tmpHome();
    expect(() => runLink({ home, add: ['bogus'] })).toThrow(/Unknown agent/);
  });
});
