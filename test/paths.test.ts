// test/paths.test.ts
import { describe, it, expect } from 'vitest';
import * as p from '../src/paths.js';

describe('paths', () => {
  it('builds global paths under ~/.se-harness', () => {
    expect(p.globalDir('/home/x')).toBe('/home/x/.se-harness');
    expect(p.globalPrefsFile('/home/x')).toBe('/home/x/.se-harness/preferences.md');
    expect(p.globalConfigFile('/home/x')).toBe('/home/x/.se-harness/config.json');
  });
  it('builds project paths', () => {
    expect(p.projectHarnessDir('/repo')).toBe('/repo/.harness');
    expect(p.lockFile('/repo')).toBe('/repo/harness.lock');
  });
  it('resolves an existing assets dir', () => {
    expect(p.assetsDir().endsWith('assets')).toBe(true);
  });
});
