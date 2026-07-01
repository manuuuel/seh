// test/layers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLayers } from '../src/layers.js';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sehlay-')); }

describe('buildLayers', () => {
  let root: string;
  beforeEach(() => {
    root = tmp();
    fs.mkdirSync(path.join(root, '.harness'), { recursive: true });
    fs.writeFileSync(path.join(root, '.harness', 'project.md'), '# Project\nMISSION');
  });

  it('includes two L0 layers and the L2 project file', () => {
    const layers = buildLayers(root);
    expect(layers.filter(l => l.name === 'L0').length).toBe(2);
    const l2 = layers.filter(l => l.name === 'L2');
    expect(l2.map(l => l.source)).toEqual(['.harness/project.md']);
    expect(l2[0].content).toContain('MISSION');
  });

  it('omits L1 when no global prefs exist', () => {
    const home = tmp(); // empty home, no ~/.se-harness/preferences.md
    expect(buildLayers(root, home).some(l => l.name === 'L1')).toBe(false);
  });

  it('includes L1 when global prefs exist', () => {
    const home = tmp();
    fs.mkdirSync(path.join(home, '.se-harness'), { recursive: true });
    fs.writeFileSync(path.join(home, '.se-harness', 'preferences.md'), 'PREFS');
    const l1 = buildLayers(root, home).filter(l => l.name === 'L1');
    expect(l1.length).toBe(1);
    expect(l1[0].content).toContain('PREFS');
  });
});
