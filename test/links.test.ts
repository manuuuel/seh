// test/links.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { linkTool, unlinkTool, isLinked } from '../src/links.js';
import { globalIndexFile, globalDir } from '../src/paths.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlink-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  return h;
}

describe('links', () => {
  it('links claude to the global index', () => {
    const home = tmpHome();
    linkTool('claude', home);
    expect(isLinked('claude', home)).toBe(true);
    const target = path.join(home, '.claude', 'CLAUDE.md');
    expect(fs.realpathSync(target)).toBe(fs.realpathSync(globalIndexFile(home)));
  });
  it('is idempotent and unlinkable', () => {
    const home = tmpHome();
    linkTool('claude', home);
    linkTool('claude', home); // replace, no throw
    unlinkTool('claude', home);
    expect(isLinked('claude', home)).toBe(false);
  });
  it('throws on unknown tool', () => {
    expect(() => linkTool('nope', tmpHome())).toThrow('Unknown tool: nope');
  });
});
