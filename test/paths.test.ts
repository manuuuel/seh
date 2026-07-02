import { describe, it, expect } from 'vitest';
import * as p from '../src/paths.js';

describe('paths (v2)', () => {
  it('builds host global paths under ~/.seh', () => {
    expect(p.globalDir('/h')).toBe('/h/.seh');
    expect(p.globalIndexFile('/h')).toBe('/h/.seh/AGENTS.md');
    expect(p.globalModulesDir('/h')).toBe('/h/.seh/global');
    expect(p.globalConfigFile('/h')).toBe('/h/.seh/config.json');
    expect(p.claudeGlobalFile('/h')).toBe('/h/.claude/CLAUDE.md');
  });
  it('builds project paths under .seh', () => {
    expect(p.projectSehDir('/r')).toBe('/r/.seh');
    expect(p.projectIndexFile('/r')).toBe('/r/AGENTS.md');
    expect(p.projectStackDir('/r')).toBe('/r/.seh/stack');
    expect(p.lockFile('/r')).toBe('/r/seh.lock');
  });
  it('resolves assets dir', () => {
    expect(p.assetsDir().endsWith('assets')).toBe(true);
  });
});
